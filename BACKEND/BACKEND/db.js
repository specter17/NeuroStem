import path from "path";
import fs from "fs/promises";
import { fileURLToPath } from "url";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, "data", "neurostem.db");

let db;

export const getDb = async () => {
    if (db) return db;
    await fs.mkdir(path.dirname(DB_PATH), { recursive: true });
    db = await open({
        filename: DB_PATH,
        driver: sqlite3.Database,
    });
    return db;
};

export const initDb = async () => {
    const database = await getDb();
    await database.exec(`
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS flashcard_decks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            subject TEXT,
            level TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS flashcards (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            deck_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            front_text TEXT,
            back_text TEXT,
            formula_text TEXT,
            code_text TEXT,
            image_path TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(deck_id) REFERENCES flashcard_decks(id)
        );

        CREATE TABLE IF NOT EXISTS flashcard_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            flashcard_id INTEGER NOT NULL,
            strength INTEGER DEFAULT 0,
            known_count INTEGER DEFAULT 0,
            unknown_count INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            bookmarked INTEGER DEFAULT 0,
            last_seen TEXT,
            last_result TEXT,
            UNIQUE(user_id, flashcard_id),
            FOREIGN KEY(user_id) REFERENCES users(id),
            FOREIGN KEY(flashcard_id) REFERENCES flashcards(id)
        );

        CREATE TABLE IF NOT EXISTS flashcard_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            mode TEXT NOT NULL,
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            ended_at TEXT,
            duration_seconds INTEGER,
            total_seen INTEGER DEFAULT 0,
            total_known INTEGER DEFAULT 0,
            total_unknown INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS quiz_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            subject TEXT,
            level TEXT,
            difficulty TEXT NOT NULL,
            started_at TEXT DEFAULT CURRENT_TIMESTAMP,
            duration_seconds INTEGER,
            status TEXT DEFAULT 'active',
            score INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            wrong_count INTEGER DEFAULT 0,
            streak INTEGER DEFAULT 0,
            best_streak INTEGER DEFAULT 0,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS quiz_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER NOT NULL,
            question_text TEXT NOT NULL,
            options_json TEXT NOT NULL,
            correct_index INTEGER NOT NULL,
            explanation TEXT,
            hint TEXT,
            user_answer INTEGER,
            is_correct INTEGER,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(session_id) REFERENCES quiz_sessions(id)
        );

        CREATE TABLE IF NOT EXISTS quiz_topic_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            topic TEXT NOT NULL,
            difficulty TEXT NOT NULL,
            correct_count INTEGER DEFAULT 0,
            wrong_count INTEGER DEFAULT 0,
            last_seen TEXT,
            UNIQUE(user_id, topic, difficulty)
        );
    `);
};
