import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs/promises";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import { initDb, getDb } from "./db.js";

const require = createRequire(import.meta.url);
const { Groq } = require("groq-sdk");
dotenv.config();

const app = express();
const apiKey = process.env.GROQ_API_KEY;
const jwtSecret = process.env.JWT_SECRET;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "uploads");

if (!apiKey) {
    console.error("❌ ERROR: GROQ_API_KEY not found in .env file");
    process.exit(1);
}
if (!jwtSecret) {
    console.error("❌ ERROR: JWT_SECRET not found in .env file");
    process.exit(1);
}

const groq = new Groq({ apiKey });

// ─── Helpers ────────────────────────────────────────────────────────────────

const getCompletionText = (completion) => {
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || content.trim() === "") {
        throw new Error("Groq response missing content");
    }
    return content;
};

const stripCodeFences = (text) => {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return match ? match[1] : text;
};

const findFirstJsonValue = (text) => {
    const firstObject = text.indexOf("{");
    const firstArray = text.indexOf("[");
    const start = [firstObject, firstArray].filter((idx) => idx >= 0).sort((a, b) => a - b)[0];
    if (start === undefined) throw new Error("Could not find JSON in AI response");

    const stack = [];
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i++) {
        const char = text[i];
        if (inString) {
            if (escaped) { escaped = false; continue; }
            if (char === "\\") { escaped = true; continue; }
            if (char === '"') inString = false;
            continue;
        }
        if (char === '"') { inString = true; continue; }
        if (char === "{" || char === "[") {
            stack.push(char);
        } else if (char === "}" || char === "]") {
            const last = stack.pop();
            if (!last) throw new Error("Unbalanced JSON delimiters in AI response");
            if ((last === "{" && char !== "}") || (last === "[" && char !== "]")) {
                throw new Error("Mismatched JSON delimiters in AI response");
            }
            if (stack.length === 0) return text.slice(start, i + 1);
        }
    }
    throw new Error("Unbalanced JSON delimiters in AI response");
};

const normalizeJsonText = (jsonText) =>
    jsonText
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/\u00A0/g, " ");

const sanitizeJsonText = (jsonText) => {
    let inString = false;
    let escaped = false;
    let sanitized = "";

    for (const char of jsonText) {
        if (inString) {
            if (escaped) { sanitized += char; escaped = false; continue; }
            if (char === "\\") { sanitized += char; escaped = true; continue; }
            if (char === '"') { sanitized += char; inString = false; continue; }
            if (char === "\n") { sanitized += "\\n"; continue; }
            if (char === "\r") { sanitized += "\\r"; continue; }
            if (char === "\t") { sanitized += "\\t"; continue; }
        } else if (char === '"') {
            inString = true;
        }
        sanitized += char;
    }
    return sanitized;
};

const extractJsonObject = (text, contextLabel = "ai") => {
    const cleaned = stripCodeFences(text).trim();
    const jsonText = normalizeJsonText(findFirstJsonValue(cleaned));
    const sanitized = sanitizeJsonText(jsonText);

    try {
        return JSON.parse(sanitized);
    } catch (error) {
        const repaired = sanitized.replace(/,\s*([}\]])/g, "$1");
        if (repaired !== sanitized) {
            try {
                return JSON.parse(repaired);
            } catch (secondError) {
                console.error(`[${contextLabel}] JSON parse failed after repair:`, secondError);
            }
        }
        console.error(`[${contextLabel}] JSON parse failed:`, error);
        console.error(`[${contextLabel}] Raw preview:`, cleaned.slice(0, 500));
        throw new Error(`Failed to parse AI JSON: ${error.message}`);
    }
};

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
await fs.mkdir(uploadDir, { recursive: true });
await initDb();
app.use("/uploads", express.static(uploadDir));

// ─── Constants ───────────────────────────────────────────────────────────────

const LEVEL_LABELS = {
    "grade1-8": "Grade 1–8",
    "grade9-12": "Grade 9–12",
    undergrad: "Undergraduate",
    phd: "Graduate / PhD",
};
const SUBJECT_LABELS = {
    math: "Mathematics",
    science: "Science",
};

const SALT_ROUNDS = 10;
const DEFAULT_CARD_COUNT = 8;
const DEFAULT_QUIZ_BATCH = 5;
const MIN_CARD_COUNT = 4;
const MAX_CARD_COUNT = 12;
const MIN_QUIZ_BATCH = 3;
const MAX_QUIZ_BATCH = 8;

// ─── Multer ──────────────────────────────────────────────────────────────────

const upload = multer({
    storage: multer.diskStorage({
        destination: (req, file, cb) => cb(null, uploadDir),
        filename: (req, file, cb) => {
            const ext = path.extname(file.originalname || "").toLowerCase();
            const safeExt = ext && ext.length <= 6 ? ext : "";
            const name = `card-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${safeExt}`;
            cb(null, name);
        },
    }),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
            return cb(new Error("Only image uploads are allowed"));
        }
        cb(null, true);
    },
});

// ─── Utils ───────────────────────────────────────────────────────────────────

const normalizeEmail = (email) => String(email || "").trim().toLowerCase();
const normalizeTopic = (topic) => {
    const cleaned = String(topic || "").trim();
    return cleaned.length > 0 ? cleaned : "General";
};
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const nowIso = () => new Date().toISOString();

const createToken = (user) =>
    jwt.sign({ id: user.id, email: user.email }, jwtSecret, { expiresIn: "7d" });

const requireAuth = (req, res, next) => {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    if (!token) return res.status(401).json({ error: "Missing auth token" });
    try {
        req.user = jwt.verify(token, jwtSecret);
        return next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

const ensureDeck = async (db, userId, topic, subject, level) => {
    const existing = await db.get(
        "SELECT id FROM flashcard_decks WHERE user_id = ? AND topic = ? AND subject = ? AND level = ?",
        userId, topic, subject, level
    );
    if (existing) return existing.id;
    const result = await db.run(
        "INSERT INTO flashcard_decks (user_id, topic, subject, level) VALUES (?, ?, ?, ?)",
        userId, topic, subject, level
    );
    return result.lastID;
};

const ensureFlashcardStats = async (db, userId, flashcardId) => {
    const existing = await db.get(
        "SELECT id FROM flashcard_stats WHERE user_id = ? AND flashcard_id = ?",
        userId, flashcardId
    );
    if (existing) return;
    await db.run(
        "INSERT INTO flashcard_stats (user_id, flashcard_id) VALUES (?, ?)",
        userId, flashcardId
    );
};

// ─── Routes ──────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
    res.json({ message: "🚀 NeuroStem Website Running Successfully" });
});

// ── Auth ─────────────────────────────────────────────────────────────────────

app.post("/api/auth/register", async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password || password.length < 6) {
        return res.status(400).json({ error: "Valid email and password (6+ chars) required" });
    }

    const db = await getDb();
    const existing = await db.get("SELECT id FROM users WHERE email = ?", email);
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await db.run(
        "INSERT INTO users (email, password_hash) VALUES (?, ?)",
        email, passwordHash
    );

    const user = { id: result.lastID, email };
    res.json({ token: createToken(user), user });
});

app.post("/api/auth/login", async (req, res) => {
    const email = normalizeEmail(req.body.email);
    const password = String(req.body.password || "");

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
    }

    const db = await getDb();
    const user = await db.get(
        "SELECT id, email, password_hash FROM users WHERE email = ?", email
    );
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return res.status(401).json({ error: "Invalid credentials" });
    }

    res.json({ token: createToken(user), user: { id: user.id, email: user.email } });
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
    const db = await getDb();
    const user = await db.get(
        "SELECT id, email, created_at FROM users WHERE id = ?", req.user.id
    );
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ user });
});

// ── STEM ─────────────────────────────────────────────────────────────────────

app.post("/api/stem/simplify", async (req, res) => {
    const { content, subject = "math", level = "grade1-8" } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const requestId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const levelLabel = LEVEL_LABELS[level] || "Grade 1-8";

    try {
        console.log(`[${requestId}] Simplify: subject=${subject}, level=${level}, len=${content.length}`);

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 1024,
            messages: [{
                role: "user",
                content: `You are an expert STEM educator. Simplify the following ${subject} content for ${levelLabel} level students.

Content: "${content}"

Provide your response in this EXACT JSON format (no markdown, pure JSON):
{
  "simple": "A clear, engaging explanation suitable for ${levelLabel} level",
  "steps": "Numbered steps (1. 2. 3.) on how to understand or solve this",
  "terms": [{"word": "important term", "definition": "simple definition"}],
  "quiz": [{"question": "Question text?", "options": ["A","B","C","D"], "correct": 0}]
}

Rules: 2-3 paragraph explanation, clear numbered steps, real terms from content, 2-3 quiz questions.`
            }],
        });

        const parsedResponse = extractJsonObject(getCompletionText(completion), `simplify:${requestId}`);
        res.json({
            simple: parsedResponse.simple,
            steps: parsedResponse.steps,
            terms: parsedResponse.terms || [],
            quiz: parsedResponse.quiz || [],
        });
    } catch (error) {
        console.error(`[${requestId}] Error:`, error);
        res.status(500).json({ error: "Failed to process request", message: error.message, requestId });
    }
});

app.post("/api/stem/extract-formulas", async (req, res) => {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 512,
            messages: [{
                role: "user",
                content: `Extract and explain all mathematical formulas in the following text. Return as JSON.

Text: "${content}"

Return format:
{"formulas": [{"formula": "E=mc²", "explanation": "Energy equals mass times speed of light squared"}]}

If no formulas found, return empty array.`
            }],
        });
        const parsed = extractJsonObject(getCompletionText(completion), "formulas");
        const formulas = Array.isArray(parsed) ? parsed : parsed.formulas;
        res.json({ formulas: Array.isArray(formulas) ? formulas : [] });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to extract formulas" });
    }
});

app.post("/api/stem/extract-jargon", async (req, res) => {
    const { content, level = "grade1-8" } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 512,
            messages: [{
                role: "user",
                content: `Identify difficult or technical words that ${level} level students might not understand.

Text: "${content}"

Return format:
{"jargon": [{"word": "acceleration", "definition": "the rate at which something speeds up"}]}`
            }],
        });
        const parsed = extractJsonObject(getCompletionText(completion), "jargon");
        const jargon = Array.isArray(parsed) ? parsed : parsed.jargon;
        res.json({ jargon: Array.isArray(jargon) ? jargon : [] });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to extract jargon" });
    }
});

app.post("/api/stem/flashcards", async (req, res) => {
    const { content, subject = "math", level = "grade1-8", count = 6 } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const cardCount = clamp(parseInt(count, 10) || 6, 2, 12);
    const levelLabel = LEVEL_LABELS[level] || "Grade 1–8";
    const subjectLabel = SUBJECT_LABELS[subject] || "Mathematics";

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 900,
            messages: [{
                role: "user",
                content: `Create ${cardCount} study flashcards from the ${subjectLabel} content below for ${levelLabel} students.

Content: "${content}"

Respond with ONLY this JSON format (no markdown):
{"cards": [{"front": "Question or prompt", "back": "Short answer"}]}

Rules: short clear fronts, 1-2 sentence backs, distinct cards covering key ideas.`
            }],
        });
        const parsed = extractJsonObject(getCompletionText(completion), "flashcards");
        const cards = Array.isArray(parsed) ? parsed : parsed.cards;
        res.json({ cards: Array.isArray(cards) ? cards : [] });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate flashcards" });
    }
});

app.post("/api/stem/quiz-bank", async (req, res) => {
    const { topic, subject = "math", level = "grade1-8", count = 6 } = req.body;
    if (!topic?.trim()) return res.status(400).json({ error: "Topic is required" });

    const questionCount = clamp(parseInt(count, 10) || 6, 2, 12);
    const levelLabel = LEVEL_LABELS[level] || "Grade 1–8";
    const subjectLabel = SUBJECT_LABELS[subject] || "Mathematics";

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 1000,
            messages: [{
                role: "user",
                content: `Create ${questionCount} multiple-choice ${subjectLabel} quiz questions about "${topic}" for ${levelLabel} students.

Respond with ONLY this JSON format (no markdown):
{"questions": [{"question": "?", "options": ["A","B","C","D"], "correct": 0, "explanation": "..."}]}

Rules: exactly 4 options, correct is index 0-3, concise explanations.`
            }],
        });
        const parsed = extractJsonObject(getCompletionText(completion), "quiz-bank");
        const questions = Array.isArray(parsed) ? parsed : parsed.questions;
        res.json({ questions: Array.isArray(questions) ? questions : [] });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate quiz" });
    }
});

// ── Flashcards ────────────────────────────────────────────────────────────────

app.post("/api/flashcards/generate", requireAuth, async (req, res) => {
    const { content, subject = "math", level = "grade1-8", count, topic } = req.body;
    if (!content?.trim()) return res.status(400).json({ error: "Content is required" });

    const cardCount = clamp(parseInt(count, 10) || DEFAULT_CARD_COUNT, MIN_CARD_COUNT, MAX_CARD_COUNT);
    const deckTopic = normalizeTopic(topic);
    const db = await getDb();

    let transactionStarted = false;

    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 1200,
            messages: [{
                role: "user",
                content: `Create ${cardCount} simple Q&A flashcards from this content.

Content: "${content}"

Return ONLY valid JSON (no markdown):
{
  "cards": [
    {"front": "Question?", "back": "Answer"}
  ]
}

Rules: short clear questions, 1-2 sentence answers, distinct cards, cover main ideas.`
            }],
        });

        const responseText = getCompletionText(completion);
        const parsedResponse = extractJsonObject(responseText, "flashcards");
        const rawCards = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.cards;
        const rawCardList = Array.isArray(rawCards) ? rawCards : [];

        const deckId = await ensureDeck(db, req.user.id, deckTopic, subject, level);
        const createdCards = [];

        await db.exec("BEGIN");
        transactionStarted = true;

        for (const card of rawCardList) {
            const frontText = String(card.front || "").trim();
            const backText = String(card.back || "").trim();

            if (!frontText || !backText) continue;

            const result = await db.run(
                `INSERT INTO flashcards (deck_id, type, front_text, back_text, formula_text, code_text, image_path)
                 VALUES (?, ?, ?, ?, NULL, NULL, NULL)`,
                deckId, "definition", frontText, backText
            );
            await ensureFlashcardStats(db, req.user.id, result.lastID);
            createdCards.push({
                id: result.lastID, type: "definition",
                front_text: frontText, back_text: backText,
                topic: deckTopic,
            });
        }

        await db.exec("COMMIT");
        transactionStarted = false;

        res.json({ deckId, topic: deckTopic, cards: createdCards });

    } catch (error) {
        if (transactionStarted) {
            await db.exec("ROLLBACK");
        }
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate flashcards" });
    }
});

app.post("/api/flashcards/image", requireAuth, upload.single("image"), async (req, res) => {
    const { topic, subject = "math", level = "grade1-8", front, back } = req.body;
    if (!req.file) return res.status(400).json({ error: "Image file is required" });

    const deckTopic = normalizeTopic(topic);
    const db = await getDb();
    const deckId = await ensureDeck(db, req.user.id, deckTopic, subject, level);

    const result = await db.run(
        `INSERT INTO flashcards (deck_id, type, front_text, back_text, formula_text, code_text, image_path)
         VALUES (?, 'image', ?, ?, NULL, NULL, ?)`,
        deckId,
        String(front || "").trim(),
        String(back || "").trim(),
        `/uploads/${req.file.filename}`
    );
    await ensureFlashcardStats(db, req.user.id, result.lastID);

    res.json({
        card: {
            id: result.lastID, type: "image",
            front: String(front || "").trim(),
            back: String(back || "").trim(),
            image: `/uploads/${req.file.filename}`,
            topic: deckTopic,
        },
    });
});

app.get("/api/flashcards/topics", requireAuth, async (req, res) => {
    const db = await getDb();
    const rows = await db.all(
        `SELECT topic, COUNT(*) as total
         FROM flashcard_decks d
         JOIN flashcards f ON f.deck_id = d.id
         WHERE d.user_id = ?
         GROUP BY topic ORDER BY topic`,
        req.user.id
    );
    res.json({ topics: rows });
});

app.get("/api/flashcards", requireAuth, async (req, res) => {
    const { topic, type, bookmarked, weak } = req.query;
    const db = await getDb();

    const filters = ["d.user_id = ?"];
    const params = [req.user.id];

    if (topic) { filters.push("d.topic = ?"); params.push(topic); }
    if (type) { filters.push("f.type = ?"); params.push(type); }
    if (bookmarked === "true") filters.push("s.bookmarked = 1");
    if (weak === "true") filters.push("(COALESCE(s.strength,0) <= 2 OR COALESCE(s.unknown_count,0) > COALESCE(s.known_count,0))");

    const rows = await db.all(
        `SELECT f.id, f.type, f.front_text, f.back_text, f.formula_text, f.code_text, f.image_path,
                d.topic, d.subject, d.level,
                COALESCE(s.strength,0) as strength,
                COALESCE(s.known_count,0) as known_count,
                COALESCE(s.unknown_count,0) as unknown_count,
                COALESCE(s.streak,0) as streak,
                COALESCE(s.bookmarked,0) as bookmarked
         FROM flashcards f
         JOIN flashcard_decks d ON d.id = f.deck_id
         LEFT JOIN flashcard_stats s ON s.flashcard_id = f.id AND s.user_id = ?
         WHERE ${filters.join(" AND ")}
         ORDER BY f.created_at DESC`,
        req.user.id, ...params
    );
    res.json({ cards: rows });
});

app.post("/api/flashcards/:id/progress", requireAuth, async (req, res) => {
    const flashcardId = parseInt(req.params.id, 10);
    const result = String(req.body.result || "").toLowerCase();
    if (!flashcardId || !["know", "dont"].includes(result)) {
        return res.status(400).json({ error: "Invalid flashcard or result" });
    }

    const db = await getDb();
    const owned = await db.get(
        `SELECT f.id FROM flashcards f
         JOIN flashcard_decks d ON d.id = f.deck_id
         WHERE f.id = ? AND d.user_id = ?`,
        flashcardId, req.user.id
    );
    if (!owned) return res.status(404).json({ error: "Flashcard not found" });

    await ensureFlashcardStats(db, req.user.id, flashcardId);
    const stats = await db.get(
        "SELECT strength, known_count, unknown_count, streak FROM flashcard_stats WHERE user_id = ? AND flashcard_id = ?",
        req.user.id, flashcardId
    );

    const known = stats?.known_count || 0;
    const unknown = stats?.unknown_count || 0;
    const streak = stats?.streak || 0;
    const strength = stats?.strength || 0;

    const nextStrength = clamp(result === "know" ? strength + 1 : strength - 1, 0, 5);
    const nextKnown = result === "know" ? known + 1 : known;
    const nextUnknown = result === "dont" ? unknown + 1 : unknown;
    const nextStreak = result === "know" ? streak + 1 : 0;

    await db.run(
        `UPDATE flashcard_stats
         SET strength=?, known_count=?, unknown_count=?, streak=?, last_seen=?, last_result=?
         WHERE user_id=? AND flashcard_id=?`,
        nextStrength, nextKnown, nextUnknown, nextStreak, nowIso(), result, req.user.id, flashcardId
    );

    res.json({ flashcardId, strength: nextStrength, known_count: nextKnown, unknown_count: nextUnknown, streak: nextStreak });
});

app.post("/api/flashcards/:id/bookmark", requireAuth, async (req, res) => {
    const flashcardId = parseInt(req.params.id, 10);
    if (!flashcardId) return res.status(400).json({ error: "Invalid flashcard" });

    const bookmarked = req.body.bookmarked ? 1 : 0;
    const db = await getDb();
    const owned = await db.get(
        `SELECT f.id FROM flashcards f
         JOIN flashcard_decks d ON d.id = f.deck_id
         WHERE f.id = ? AND d.user_id = ?`,
        flashcardId, req.user.id
    );
    if (!owned) return res.status(404).json({ error: "Flashcard not found" });

    await ensureFlashcardStats(db, req.user.id, flashcardId);
    await db.run(
        "UPDATE flashcard_stats SET bookmarked=? WHERE user_id=? AND flashcard_id=?",
        bookmarked, req.user.id, flashcardId
    );
    res.json({ flashcardId, bookmarked });
});

app.get("/api/flashcards/revision", requireAuth, async (req, res) => {
    const { topic, limit, type, bookmarked } = req.query;
    const db = await getDb();
    const filters = ["d.user_id = ?"];
    const params = [req.user.id];

    if (topic) { filters.push("d.topic = ?"); params.push(topic); }
    if (type) { filters.push("f.type = ?"); params.push(type); }
    if (bookmarked === "true") filters.push("s.bookmarked = 1");
    filters.push("(COALESCE(s.strength,0) <= 2 OR COALESCE(s.unknown_count,0) > COALESCE(s.known_count,0))");

    const countLimit = clamp(parseInt(limit, 10) || 20, 5, 50);

    const rows = await db.all(
        `SELECT f.id, f.type, f.front_text, f.back_text, f.formula_text, f.code_text, f.image_path,
                d.topic, d.subject, d.level,
                COALESCE(s.strength,0) as strength,
                COALESCE(s.known_count,0) as known_count,
                COALESCE(s.unknown_count,0) as unknown_count,
                COALESCE(s.streak,0) as streak,
                COALESCE(s.bookmarked,0) as bookmarked
         FROM flashcards f
         JOIN flashcard_decks d ON d.id = f.deck_id
         LEFT JOIN flashcard_stats s ON s.flashcard_id = f.id AND s.user_id = ?
         WHERE ${filters.join(" AND ")}
         ORDER BY COALESCE(s.strength,0) ASC, COALESCE(s.last_seen,'1970-01-01') ASC
         LIMIT ?`,
        req.user.id, ...params, countLimit
    );
    res.json({ cards: rows });
});

app.get("/api/flashcards/analytics", requireAuth, async (req, res) => {
    const db = await getDb();
    const totals = await db.get(
        `SELECT COUNT(*) as total,
                SUM(CASE WHEN COALESCE(s.known_count,0) > COALESCE(s.unknown_count,0) THEN 1 ELSE 0 END) as mastered,
                SUM(CASE WHEN COALESCE(s.unknown_count,0) > COALESCE(s.known_count,0) THEN 1 ELSE 0 END) as weak,
                SUM(CASE WHEN COALESCE(s.bookmarked,0) = 1 THEN 1 ELSE 0 END) as bookmarked
         FROM flashcards f
         JOIN flashcard_decks d ON d.id = f.deck_id
         LEFT JOIN flashcard_stats s ON s.flashcard_id = f.id AND s.user_id = ?
         WHERE d.user_id = ?`,
        req.user.id, req.user.id
    );

    const topics = await db.all(
        `SELECT d.topic,
                COUNT(*) as total,
                SUM(CASE WHEN COALESCE(s.known_count,0) > COALESCE(s.unknown_count,0) THEN 1 ELSE 0 END) as mastered,
                SUM(CASE WHEN COALESCE(s.unknown_count,0) > COALESCE(s.known_count,0) THEN 1 ELSE 0 END) as weak
         FROM flashcards f
         JOIN flashcard_decks d ON d.id = f.deck_id
         LEFT JOIN flashcard_stats s ON s.flashcard_id = f.id AND s.user_id = ?
         WHERE d.user_id = ?
         GROUP BY d.topic ORDER BY d.topic`,
        req.user.id, req.user.id
    );

    const totalCount = totals?.total || 0;
    const progress = totalCount > 0 ? Math.round(((totals.mastered || 0) / totalCount) * 100) : 0;

    res.json({
        totals: {
            total: totalCount,
            mastered: totals?.mastered || 0,
            weak: totals?.weak || 0,
            bookmarked: totals?.bookmarked || 0,
            progress,
        },
        topics,
    });
});

// ── Sessions ──────────────────────────────────────────────────────────────────

app.post("/api/flashcards/sessions", requireAuth, async (req, res) => {
    const { mode = "standard", durationSeconds = 0 } = req.body;
    const db = await getDb();
    const result = await db.run(
        "INSERT INTO flashcard_sessions (user_id, mode, duration_seconds) VALUES (?, ?, ?)",
        req.user.id, String(mode || "standard"), parseInt(durationSeconds, 10) || 0
    );
    res.json({ sessionId: result.lastID });
});

app.post("/api/flashcards/sessions/:id/finish", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) return res.status(400).json({ error: "Invalid session" });

    const { totalSeen = 0, totalKnown = 0, totalUnknown = 0 } = req.body;
    const db = await getDb();
    await db.run(
        `UPDATE flashcard_sessions
         SET ended_at=?, total_seen=?, total_known=?, total_unknown=?
         WHERE id=? AND user_id=?`,
        nowIso(),
        parseInt(totalSeen, 10) || 0,
        parseInt(totalKnown, 10) || 0,
        parseInt(totalUnknown, 10) || 0,
        sessionId, req.user.id
    );
    res.json({ sessionId });
});

// ── Quiz ──────────────────────────────────────────────────────────────────────

app.post("/api/quiz/sessions", requireAuth, async (req, res) => {
    const { topic, subject = "math", level = "grade1-8", difficulty = "easy", durationSeconds = 0 } = req.body;
    const normalizedTopic = normalizeTopic(topic);
    const levelLabel = LEVEL_LABELS[level] || "Grade 1–8";
    const subjectLabel = SUBJECT_LABELS[subject] || "Mathematics";
    const difficultyValue = String(difficulty || "easy").toLowerCase();

    if (!["easy", "medium", "hard"].includes(difficultyValue)) {
        return res.status(400).json({ error: "Difficulty must be easy, medium, or hard" });
    }

    const db = await getDb();
    const result = await db.run(
        `INSERT INTO quiz_sessions (user_id, topic, subject, level, difficulty, duration_seconds)
         VALUES (?, ?, ?, ?, ?, ?)`,
        req.user.id, normalizedTopic, subjectLabel, levelLabel, difficultyValue,
        parseInt(durationSeconds, 10) || 0
    );

    res.json({
        sessionId: result.lastID,
        topic: normalizedTopic,
        subject: subjectLabel,
        level: levelLabel,
        difficulty: difficultyValue,
    });
});

app.post("/api/quiz/sessions/:id/generate", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) return res.status(400).json({ error: "Invalid session" });

    const db = await getDb();
    const session = await db.get(
        "SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?",
        sessionId, req.user.id
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    const batchSize = clamp(parseInt(req.body.count, 10) || DEFAULT_QUIZ_BATCH, MIN_QUIZ_BATCH, MAX_QUIZ_BATCH);

    // ✅ FIX 3: transactionStarted declared OUTSIDE try
   let transactionStarted = false;
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 1200,
            messages: [{
                role: "user",
                content: `Create ${batchSize} ${session.difficulty} difficulty multiple-choice ${session.subject} quiz questions about "${session.topic}" for ${session.level} students.

Return ONLY valid JSON (no markdown):
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["A","B","C","D"],
      "correct": 0,
      "explanation": "Short explanation",
      "hint": "Brief hint without giving away the answer"
    }
  ]
}

Rules: exactly 4 options, correct is 0-3, 1-2 sentence explanations, short subtle hints.`
            }],
        });

        const responseText = getCompletionText(completion);
        const parsedResponse = extractJsonObject(responseText, "quiz");
        const questions = Array.isArray(parsedResponse) ? parsedResponse : parsedResponse.questions;
        const questionList = Array.isArray(questions) ? questions : [];

        const stored = [];
        await db.exec("BEGIN");
        transactionStarted = true;

        for (const question of questionList) {
            const options = Array.isArray(question.options) ? question.options.slice(0, 4) : [];
            if (!question.question || options.length !== 4) continue;
            const correct = clamp(parseInt(question.correct, 10) || 0, 0, 3);
            const result = await db.run(
                `INSERT INTO quiz_questions (session_id, question_text, options_json, correct_index, explanation, hint)
                 VALUES (?, ?, ?, ?, ?, ?)`,
                sessionId, question.question, JSON.stringify(options), correct,
                question.explanation || "", question.hint || ""
            );
            stored.push({
                id: result.lastID, question: question.question, options, correct,
                explanation: question.explanation || "", hint: question.hint || "",
            });
        }

        await db.exec("COMMIT");
        transactionStarted = false;

        res.json({ sessionId, questions: stored });

    } catch (error) {
        if (transactionStarted) await db.exec("ROLLBACK");
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate quiz questions" });
    }
});

app.post("/api/quiz/questions/:id/answer", requireAuth, async (req, res) => {
    const questionId = parseInt(req.params.id, 10);
    const answerIndex = parseInt(req.body.answerIndex, 10);
    if (!questionId || Number.isNaN(answerIndex) || answerIndex < 0 || answerIndex > 3) {
        return res.status(400).json({ error: "Invalid answer" });
    }

    const db = await getDb();
    const question = await db.get(
        `SELECT q.*, s.user_id, s.topic, s.difficulty, s.score, s.correct_count, s.wrong_count, s.streak, s.best_streak
         FROM quiz_questions q
         JOIN quiz_sessions s ON s.id = q.session_id
         WHERE q.id = ? AND s.user_id = ?`,
        questionId, req.user.id
    );
    if (!question) return res.status(404).json({ error: "Question not found" });

    const isCorrect = answerIndex === question.correct_index;
    const nextStreak = isCorrect ? question.streak + 1 : 0;
    const nextBestStreak = Math.max(question.best_streak, nextStreak);
    const bonus = isCorrect ? Math.min(nextStreak * 2, 20) : 0;
    const nextScore = (question.score || 0) + (isCorrect ? 10 : 0) + bonus;
    const nextCorrect = (question.correct_count || 0) + (isCorrect ? 1 : 0);
    const nextWrong = (question.wrong_count || 0) + (isCorrect ? 0 : 1);

    // ✅ FIX 4: transactionStarted declared OUTSIDE try
    let transactionStarted = false;

    try {
        await db.exec("BEGIN");
        transactionStarted = true;

        await db.run(
            "UPDATE quiz_questions SET user_answer=?, is_correct=? WHERE id=?",
            answerIndex, isCorrect ? 1 : 0, questionId
        );
        await db.run(
            `UPDATE quiz_sessions SET score=?, correct_count=?, wrong_count=?, streak=?, best_streak=? WHERE id=?`,
            nextScore, nextCorrect, nextWrong, nextStreak, nextBestStreak, question.session_id
        );
        await db.run(
            `INSERT INTO quiz_topic_stats (user_id, topic, difficulty, correct_count, wrong_count, last_seen)
             VALUES (?, ?, ?, ?, ?, ?)
             ON CONFLICT(user_id, topic, difficulty)
             DO UPDATE SET
                 correct_count = correct_count + excluded.correct_count,
                 wrong_count = wrong_count + excluded.wrong_count,
                 last_seen = excluded.last_seen`,
            req.user.id, question.topic, question.difficulty,
            isCorrect ? 1 : 0, isCorrect ? 0 : 1, nowIso()
        );

        await db.exec("COMMIT");
        transactionStarted = false;

    } catch (error) {
        if (transactionStarted) await db.exec("ROLLBACK");
        console.error("API Error:", error);
        return res.status(500).json({ error: "Failed to record answer" });
    }

    res.json({ questionId, isCorrect, score: nextScore, streak: nextStreak, bestStreak: nextBestStreak });
});

app.post("/api/quiz/questions/:id/hint", requireAuth, async (req, res) => {
    const questionId = parseInt(req.params.id, 10);
    if (!questionId) return res.status(400).json({ error: "Invalid question" });

    const db = await getDb();
    const question = await db.get(
        `SELECT q.*, s.user_id FROM quiz_questions q
         JOIN quiz_sessions s ON s.id = q.session_id
         WHERE q.id = ? AND s.user_id = ?`,
        questionId, req.user.id
    );
    if (!question) return res.status(404).json({ error: "Question not found" });
    if (question.hint?.trim()) return res.json({ hint: question.hint });

    const options = JSON.parse(question.options_json);
    try {
        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 120,
            messages: [{
                role: "user",
                content: `Provide a short hint to help answer this question without giving away the answer.

Question: ${question.question_text}
Options: ${options.join(" | ")}

Hint:`
            }],
        });
        const hintText = getCompletionText(completion).trim();
        await db.run("UPDATE quiz_questions SET hint=? WHERE id=?", hintText, questionId);
        res.json({ hint: hintText });
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate hint" });
    }
});

app.get("/api/quiz/sessions/:id/analytics", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) return res.status(400).json({ error: "Invalid session" });

    const db = await getDb();
    const session = await db.get(
        "SELECT * FROM quiz_sessions WHERE id = ? AND user_id = ?",
        sessionId, req.user.id
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    const attempts = (session.correct_count || 0) + (session.wrong_count || 0);
    const accuracy = attempts > 0 ? session.correct_count / attempts : 0;

    let recommendedDifficulty = session.difficulty;
    if (accuracy >= 0.8 && session.best_streak >= 5) {
        recommendedDifficulty = session.difficulty === "easy" ? "medium" : "hard";
    } else if (accuracy <= 0.5) {
        recommendedDifficulty = session.difficulty === "hard" ? "medium" : "easy";
    }

    const weakTopics = await db.all(
        `SELECT topic, difficulty, correct_count, wrong_count,
                CASE WHEN (correct_count+wrong_count) > 0
                     THEN CAST(correct_count AS REAL)/(correct_count+wrong_count)
                     ELSE 0 END as accuracy
         FROM quiz_topic_stats WHERE user_id=?
         ORDER BY accuracy ASC LIMIT 5`,
        req.user.id
    );

    res.json({
        sessionId, score: session.score,
        correct: session.correct_count, wrong: session.wrong_count,
        streak: session.streak, bestStreak: session.best_streak,
        accuracy: Math.round(accuracy * 100),
        recommendedDifficulty, weakTopics,
    });
});

app.get("/api/quiz/analytics", requireAuth, async (req, res) => {
    const db = await getDb();
    const topics = await db.all(
        `SELECT topic, difficulty, correct_count, wrong_count,
                CASE WHEN (correct_count+wrong_count) > 0
                     THEN CAST(correct_count AS REAL)/(correct_count+wrong_count)
                     ELSE 0 END as accuracy
         FROM quiz_topic_stats WHERE user_id=?
         ORDER BY accuracy ASC`,
        req.user.id
    );
    res.json({ topics });
});

app.post("/api/quiz/sessions/:id/retry-wrong", requireAuth, async (req, res) => {
    const sessionId = parseInt(req.params.id, 10);
    if (!sessionId) return res.status(400).json({ error: "Invalid session" });

    const db = await getDb();
    const session = await db.get(
        "SELECT id FROM quiz_sessions WHERE id = ? AND user_id = ?",
        sessionId, req.user.id
    );
    if (!session) return res.status(404).json({ error: "Session not found" });

    await db.run(
        "UPDATE quiz_questions SET user_answer=NULL, is_correct=NULL WHERE session_id=? AND is_correct=0",
        sessionId
    );
    const rows = await db.all(
        "SELECT id, question_text, options_json, correct_index, explanation, hint FROM quiz_questions WHERE session_id=? AND is_correct IS NULL",
        sessionId
    );
    const questions = rows.map((q) => ({
        id: q.id, question: q.question_text,
        options: JSON.parse(q.options_json),
        correct: q.correct_index,
        explanation: q.explanation, hint: q.hint,
    }));
    res.json({ sessionId, questions });
});

// ─── Error Handler ────────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
    if (err && (err instanceof multer.MulterError || err.message === "Only image uploads are allowed")) {
        return res.status(400).json({ error: err.message });
    }
    return next(err);
});

// ─── Start ────────────────────────────────────────────────────────────────────

if (process.env.NODE_ENV !== "production") {
    app.listen(3000, () => {
        console.log("🚀 Server running on http://localhost:3000");
        console.log("✅ Groq API connected");
    });
}

// Export the app for Vercel's serverless functions using ESM syntax
export default app;
