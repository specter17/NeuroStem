import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { Groq } = require("groq-sdk");

dotenv.config();

const app = express();
const apiKey = process.env.GROQ_API_KEY;

if (!apiKey) {
    console.error("❌ ERROR: GROQ_API_KEY not found in .env file");
    process.exit(1);
}

const groq = new Groq({ apiKey });
console.log("✅ Groq SDK initialized");

const getCompletionText = (completion) => {
    const content = completion?.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.trim() === '') {
        throw new Error("Groq response missing content");
    }
    return content;
};

app.use(cors());
app.use(express.json());

const LEVEL_LABELS = {
    'grade1-8': 'Grade 1–8',
    'grade9-12': 'Grade 9–12',
    'undergrad': 'Undergraduate',
    'phd': 'Graduate / PhD',
};
const SUBJECT_LABELS = {
    'math': 'Mathematics',
    'science': 'Science',
};

app.get("/", (req, res) => {
    res.json({
        message: "🚀 NeuroStem Website Running Successfully"
    });
});

app.post("/api/stem/simplify", async (req, res) => {
    const { content, subject = 'math', level = 'grade1-8' } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Content is required" });
    }

    try {
        const levelLabel = LEVEL_LABELS[level] || 'Grade 1-8';
        
        const prompt = `You are an expert STEM educator. Simplify the following ${subject} content for ${levelLabel} level students.

Content: "${content}"

Provide your response in this EXACT JSON format (no markdown, pure JSON):
{
  "simple": "A clear, engaging explanation suitable for ${levelLabel} level",
  "steps": "Numbered steps (1. 2. 3.) on how to understand or solve this",
  "terms": [
    {"word": "important term", "definition": "simple definition"}
  ],
  "quiz": [
    {"question": "A quiz question", "options": ["option1", "option2", "option3", "option4"], "correct": 0}
  ]
}

Remember: Use ONLY the JSON format above. No extra text.`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 1024,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const content_text = getCompletionText(completion);
        const jsonMatch = content_text.match(/\{[\s\S]*\}/);
        const parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : content_text);

        res.json(parsedResponse);

    } catch (error) {
        console.error("API Error:", error.message || error);
        console.error("Error details:", error);
        res.status(500).json({ error: "Failed to simplify content", details: error.message });
    }
});

app.post("/api/stem/extract-formulas", async (req, res) => {
    const { content } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Content is required" });
    }

    try {
        const prompt = `Extract and explain all mathematical or scientific formulas from this text:

"${content}"

Respond in this EXACT JSON format:
{
  "formulas": [
    {"formula": "F = ma", "explanation": "Force equals mass times acceleration"},
    {"formula": "E = mc²", "explanation": "Energy equals mass times speed of light squared"}
  ]
}

If no formulas found, return: {"formulas": []}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 512,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const content_text = getCompletionText(completion);
        const jsonMatch = content_text.match(/\{[\s\S]*\}/);
        const parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : '{"formulas": []}');

        res.json(parsedResponse);

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to extract formulas" });
    }
});

app.post("/api/stem/extract-jargon", async (req, res) => {
    const { content, level = 'grade1-8' } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Content is required" });
    }

    try {
        const prompt = `Find and explain difficult or technical words in this text for a ${level} level student:

"${content}"

Respond in this EXACT JSON format:
{
  "jargon": [
    {"word": "photosynthesis", "definition": "Process where plants convert sunlight into energy"},
    {"word": "velocity", "definition": "Speed in a specific direction"}
  ]
}

If no difficult words, return: {"jargon": []}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 512,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const content_text = getCompletionText(completion);
        const jsonMatch = content_text.match(/\{[\s\S]*\}/);
        const parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : '{"jargon": []}');

        res.json(parsedResponse);

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to extract jargon" });
    }
});

app.post("/api/stem/flashcards", async (req, res) => {
    const { content, subject = 'math', level = 'grade1-8', count = 6 } = req.body;

    if (!content || content.trim() === '') {
        return res.status(400).json({ error: "Content is required" });
    }

    const cardCount = Math.min(Math.max(parseInt(count, 10) || 6, 2), 12);
    const levelLabel = LEVEL_LABELS[level] || 'Grade 1–8';
    const subjectLabel = SUBJECT_LABELS[subject] || 'Mathematics';

    try {
        const prompt = `Create ${cardCount} study flashcards from the ${subjectLabel} content below for ${levelLabel} students.

Content: "${content}"

Respond with ONLY this JSON format (no markdown, no backticks):
{
  "cards": [
    {"front": "Question or prompt", "back": "Short answer or explanation"}
  ]
}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 900,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const content_text = getCompletionText(completion);
        const jsonMatch = content_text.match(/\{[\s\S]*\}/);
        const parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : '{"cards": []}');

        res.json(parsedResponse);
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate flashcards" });
    }
});

app.post("/api/stem/quiz-bank", async (req, res) => {
    const { topic, subject = 'math', level = 'grade1-8', count = 6 } = req.body;

    if (!topic || topic.trim() === '') {
        return res.status(400).json({ error: "Topic is required" });
    }

    const questionCount = Math.min(Math.max(parseInt(count, 10) || 6, 2), 12);
    const levelLabel = LEVEL_LABELS[level] || 'Grade 1–8';
    const subjectLabel = SUBJECT_LABELS[subject] || 'Mathematics';

    try {
        const prompt = `Create ${questionCount} multiple-choice ${subjectLabel} quiz questions about "${topic}" for ${levelLabel} students.

Respond with ONLY this JSON format (no markdown, no backticks):
{
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct": 0,
      "explanation": "Short explanation of the correct answer"
    }
  ]
}`;

        const completion = await groq.chat.completions.create({
            model: "llama-3.1-8b-instant",
            max_tokens: 1000,
            messages: [
                { role: "user", content: prompt }
            ],
        });

        const content_text = getCompletionText(completion);
        const jsonMatch = content_text.match(/\{[\s\S]*\}/);
        const parsedResponse = JSON.parse(jsonMatch ? jsonMatch[0] : '{"questions": []}');

        res.json(parsedResponse);
    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Failed to generate quiz" });
    }
});

app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
    console.log("✅ Groq API connected");
});
