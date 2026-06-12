# 🧠 NeuroStem

> **Intelligent STEM Education Platform** — Simplify complex concepts, generate adaptive flashcards, and master any subject with AI-powered learning.

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v4+-blue)](https://expressjs.com/)
[![SQLite](https://img.shields.io/badge/SQLite-3+-lightblue)](https://www.sqlite.org/)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Environment Setup](#environment-setup)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Team](#team)
- [Contributing](#contributing)

---

## 🎯 Overview

**NeuroStem** is an intelligent learning platform designed to help students master STEM (Science, Technology, Engineering, Mathematics) subjects through:

- **AI-Powered Content Simplification** — Breaks down complex topics into digestible explanations
- **Adaptive Flashcard System** — Intelligently spaced repetition based on student performance
- **Dynamic Quiz Generation** — Creates assessments tailored to learning level and difficulty
- **Progress Analytics** — Real-time tracking of mastery and weak areas
- **Accessibility Features** — Text-to-speech, bookmarking, and multi-format support

Perfect for students, educators, and anyone looking to strengthen their STEM fundamentals.

---

## ✨ Features

### 🧪 STEM Simplification
- Break down complex topics into clear, grade-appropriate explanations
- Extract key terminology and difficult jargon with definitions
- Identify and explain mathematical formulas
- Generate practice problems and quizzes automatically

### 📚 Flashcard Management
- **Generate Flashcards** — AI creates flashcards from any content
- **Image Cards** — Upload and annotate images as study material
- **Smart Filtering** — Sort by topic, type, bookmarks, or weak cards
- **Spaced Repetition** — Algorithm prioritizes cards you struggle with
- **Session Tracking** — Monitor study time and card mastery
- **Revision Mode** — Focus on your weakest cards

### 🎓 Quiz System
- **Difficulty Levels** — Easy, Medium, Hard adaptive questions
- **Smart Hints** — Get guidance without spoiling answers
- **Performance Analytics** — Accuracy, streaks, and recommendations
- **Retry Mechanism** — Re-answer incorrect questions
- **Topic-Specific Stats** — Track weak areas by subject

### 👤 User Features
- **Secure Authentication** — Register, login, token-based sessions
- **Personal Dashboard** — View all your decks and progress
- **Progress Analytics** — Visualize mastery across topics
- **Dark Mode** — Eye-friendly theme support
- **Responsive Design** — Works on desktop, tablet, and mobile

---

## 🛠 Tech Stack

### Backend
- **Runtime:** Node.js (v16+)
- **Framework:** Express.js
- **Database:** SQLite3
- **Authentication:** JWT (JSON Web Tokens) + bcryptjs
- **AI API:** Groq (llama-3.1-8b-instant)
- **File Upload:** Multer
- **CORS:** Enable cross-origin requests

### Frontend
- **Language:** Vanilla JavaScript (ES6+)
- **Styling:** CSS3 (custom design system)
- **Storage:** localStorage (session management)
- **APIs:** Fetch API, Web Speech API
- **Deployment:** Netlify

### DevOps
- **Backend Hosting:** Render
- **Frontend Hosting:** Netlify

---

## 📦 Installation

### Prerequisites
- **Node.js** v16 or higher
- **npm** or **yarn** package manager
- **SQLite3** (included with Node.js via npm)
- Groq API key (free tier available at [console.groq.com](https://console.groq.com))

### Clone Repository

```bash
git clone https://github.com/specter17/NeuroStem.git
cd NeuroStem
```

### Install Dependencies

```bash
npm install
```

### Verify Installation

```bash
node -v
npm -v
```

---

## ⚙️ Environment Setup

### 1. Create `.env` File

```bash
cp .env.example .env
```

### 2. Configure Environment Variables

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database
DATABASE_URL=./neurostem.db

# Authentication
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long-here

# Groq API
GROQ_API_KEY=gsk_your_actual_groq_api_key_here

# Frontend URL (for CORS)
FRONTEND_URL=https://neurostem.netlify.app
```

### 3. Obtain Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Generate an API key from the dashboard
4. Add it to your `.env` file

### 4. Generate JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste into `JWT_SECRET` in `.env`.

---

## 🚀 Running the Application

### Start Backend Server

```bash
npm start
```

Expected output:
```
Server running on port 3000
Database initialized
```

### Start Frontend (Separate Terminal)

The frontend is hosted on Netlify. For local development:

```bash
# If using a local frontend server
npm run dev-frontend
```

### Access the Application

- **Backend API:** `http://localhost:3000`
- **Frontend:** `https://neurostem.netlify.app` (production)

### Test API Endpoint

```bash
curl -X GET http://localhost:3000/
# Response: { "message": "🚀 NeuroStem Website Running Successfully" }
```

---

## 📡 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response: { "token": "jwt_token", "user": { "id": 1, "email": "user@example.com" } }
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword123"
}

Response: { "token": "jwt_token", "user": { "id": 1, "email": "user@example.com" } }
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>

Response: { "user": { "id": 1, "email": "user@example.com", "created_at": "2024-01-15T10:30:00Z" } }
```

### STEM Endpoints

#### Simplify Content
```http
POST /api/stem/simplify
Content-Type: application/json

{
  "content": "Einstein's theory of relativity states...",
  "subject": "science",
  "level": "grade9-12"
}

Response: {
  "simple": "Simplified explanation...",
  "steps": "Step 1: ...\nStep 2: ...",
  "terms": [{"word": "relativity", "definition": "..."}],
  "quiz": [{"question": "?", "options": ["A","B","C","D"], "correct": 0}]
}
```

#### Extract Formulas
```http
POST /api/stem/extract-formulas
Content-Type: application/json

{
  "content": "E=mc² is the famous equation..."
}

Response: {
  "formulas": [
    {"formula": "E=mc²", "explanation": "Energy equals mass times speed of light squared"}
  ]
}
```

#### Extract Jargon
```http
POST /api/stem/extract-jargon
Content-Type: application/json

{
  "content": "The mitochondria is the powerhouse of the cell...",
  "level": "grade1-8"
}

Response: {
  "jargon": [
    {"word": "mitochondria", "definition": "Part of a cell that produces energy"}
  ]
}
```

### Flashcard Endpoints

#### Generate Flashcards
```http
POST /api/flashcards/generate
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Photosynthesis is the process...",
  "subject": "science",
  "level": "grade9-12",
  "count": 8,
  "topic": "Photosynthesis"
}

Response: {
  "deckId": 1,
  "topic": "Photosynthesis",
  "cards": [
    {
      "id": 1,
      "type": "definition",
      "front_text": "What is photosynthesis?",
      "back_text": "Process by which plants convert sunlight to energy",
      "topic": "Photosynthesis"
    }
  ]
}
```

#### Get All Flashcards
```http
GET /api/flashcards?topic=Photosynthesis&bookmarked=true&weak=false
Authorization: Bearer <token>

Response: {
  "cards": [
    {
      "id": 1,
      "type": "definition",
      "front_text": "?",
      "back_text": "...",
      "strength": 3,
      "known_count": 5,
      "unknown_count": 2,
      "streak": 2,
      "bookmarked": 1
    }
  ]
}
```

#### Record Flashcard Progress
```http
POST /api/flashcards/:id/progress
Authorization: Bearer <token>
Content-Type: application/json

{
  "result": "know"  // or "dont"
}

Response: {
  "flashcardId": 1,
  "strength": 4,
  "known_count": 6,
  "unknown_count": 2,
  "streak": 3
}
```

#### Bookmark Flashcard
```http
POST /api/flashcards/:id/bookmark
Authorization: Bearer <token>
Content-Type: application/json

{
  "bookmarked": true
}

Response: { "flashcardId": 1, "bookmarked": true }
```

#### Get Flashcard Analytics
```http
GET /api/flashcards/analytics
Authorization: Bearer <token>

Response: {
  "totals": {
    "total": 50,
    "mastered": 35,
    "weak": 15,
    "bookmarked": 8,
    "progress": 70
  },
  "topics": [
    {"topic": "Photosynthesis", "total": 10, "mastered": 8, "weak": 2}
  ]
}
```

### Quiz Endpoints

#### Create Quiz Session
```http
POST /api/quiz/sessions
Authorization: Bearer <token>
Content-Type: application/json

{
  "topic": "Photosynthesis",
  "subject": "science",
  "level": "grade9-12",
  "difficulty": "medium",
  "durationSeconds": 300
}

Response: {
  "sessionId": 1,
  "topic": "Photosynthesis",
  "subject": "Science",
  "level": "Grade 9–12",
  "difficulty": "medium"
}
```

#### Generate Quiz Questions
```http
POST /api/quiz/sessions/:id/generate
Authorization: Bearer <token>
Content-Type: application/json

{}

Response: {
  "sessionId": 1,
  "questions": [
    {
      "id": 1,
      "question": "What is the main purpose of photosynthesis?",
      "options": ["A) Respiration", "B) Energy production", "C) Waste removal", "D) Growth"],
      "correct": 1,
      "explanation": "Photosynthesis converts light energy into chemical energy",
      "hint": "Think about where plants get their food"
    }
  ]
}
```

#### Answer Quiz Question
```http
POST /api/quiz/questions/:id/answer
Authorization: Bearer <token>
Content-Type: application/json

{
  "answerIndex": 1
}

Response: {
  "questionId": 1,
  "isCorrect": true,
  "score": 20,
  "streak": 3,
  "bestStreak": 5
}
```

#### Get Hint
```http
POST /api/quiz/questions/:id/hint
Authorization: Bearer <token>
Content-Type: application/json

{}

Response: { "hint": "Think about where plants get their energy from" }
```

#### Get Quiz Analytics
```http
GET /api/quiz/sessions/:id/analytics
Authorization: Bearer <token>

Response: {
  "sessionId": 1,
  "score": 150,
  "correct": 10,
  "wrong": 2,
  "streak": 5,
  "bestStreak": 7,
  "accuracy": 83,
  "recommendedDifficulty": "hard",
  "weakTopics": [
    {"topic": "Cellular Respiration", "difficulty": "medium", "accuracy": 0.5}
  ]
}
```

---

## 📁 Project Structure

```
NeuroStem/
├── server.js                 # Express backend server
├── db.js                     # SQLite database initialization
├── script.js                 # Frontend JavaScript logic
├── index.html                # Frontend HTML structure
├── styles.css                # Frontend styling
├── .env.example              # Environment variables template
├── package.json              # Node dependencies and scripts
├── uploads/                  # User-uploaded images
├── neurostem.db              # SQLite database (auto-created)
└── README.md                 # This file
```

### Database Schema

```sql
-- Users Table
CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Flashcard Decks
CREATE TABLE flashcard_decks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  subject TEXT,
  level TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Flashcards
CREATE TABLE flashcards (
  id INTEGER PRIMARY KEY,
  deck_id INTEGER NOT NULL,
  type TEXT,
  front_text TEXT,
  back_text TEXT,
  formula_text TEXT,
  code_text TEXT,
  image_path TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (deck_id) REFERENCES flashcard_decks(id)
);

-- Flashcard Stats
CREATE TABLE flashcard_stats (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  flashcard_id INTEGER NOT NULL,
  strength INTEGER DEFAULT 0,
  known_count INTEGER DEFAULT 0,
  unknown_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  bookmarked INTEGER DEFAULT 0,
  last_seen TEXT,
  last_result TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (flashcard_id) REFERENCES flashcards(id),
  UNIQUE(user_id, flashcard_id)
);

-- Quiz Sessions
CREATE TABLE quiz_sessions (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  subject TEXT,
  level TEXT,
  difficulty TEXT DEFAULT 'easy',
  duration_seconds INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  ended_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Quiz Questions
CREATE TABLE quiz_questions (
  id INTEGER PRIMARY KEY,
  session_id INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  options_json TEXT,
  correct_index INTEGER,
  user_answer INTEGER,
  is_correct INTEGER,
  explanation TEXT,
  hint TEXT,
  FOREIGN KEY (session_id) REFERENCES quiz_sessions(id)
);

-- Quiz Topic Stats
CREATE TABLE quiz_topic_stats (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT,
  correct_count INTEGER DEFAULT 0,
  wrong_count INTEGER DEFAULT 0,
  last_seen TEXT,
  UNIQUE(user_id, topic, difficulty),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🎓 Usage Guide

### For Students

#### 1. Create an Account
- Click **"Account"** in the top-right corner
- Register with email and password
- Login to access your dashboard

#### 2. Simplify STEM Content
- Paste complex content in the input box
- Select your grade level and subject
- Click **"✨ Simplify"**
- Explore tabs: Simple Explanation, Steps, Terms, Formulas, Jargon

#### 3. Generate Flashcards
- Copy the content from the Simplify tab or paste new content
- Enter a topic name (e.g., "Photosynthesis")
- Choose number of cards (4–12)
- Click **"✨ Generate Flashcards"**
- Study cards by swiping left (don't know) or right (know)

#### 4. Practice with Quizzes
- Enter a topic in the Quiz section
- Select difficulty level (Easy, Medium, Hard)
- Set a timer (optional)
- Click **"Start Quiz"**
- Use hints if needed
- Review explanations for incorrect answers

#### 5. Track Progress
- View your **Progress** section to see:
  - Cards mastered
  - Weak areas
  - Bookmarked cards
  - Performance by topic

### For Educators

#### Create Study Materials
- Simplify curriculum content for students
- Generate flashcard decks for classes
- Create differentiated quizzes by difficulty

#### Monitor Performance
- Use analytics to identify student weak areas
- Recommend focused revision on weak topics
- Track overall class progress

---

## 🤝 Team

| Name | Role |
|------|------|
| **Shagun Gupta** | Full-Stack Developer |
| **Nikhilesh Sarode** | Backend & Database Developer |

---

## 🤗 Contributing

We welcome contributions! Please follow these steps:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/AmazingFeature`)
3. **Commit** changes (`git commit -m 'Add AmazingFeature'`)
4. **Push** to branch (`git push origin feature/AmazingFeature`)
5. **Open** a Pull Request

### Contribution Guidelines
- Follow existing code style (ESLint config)
- Add comments for complex logic
- Update README if adding features
- Test thoroughly before submitting PR
- Include issue number in commit message

### Bug Reports
Found a bug? Please create an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Screenshots (if applicable)

---

## 🔗 Links

- **Live App:** https://neurostem.netlify.app
- **Backend API:** https://neurostem-backend-kt8l.onrender.com
- **Groq API:** https://console.groq.com
- **Report Issues:** [GitHub Issues](https://github.com/specter17/NeuroStem/issues)

---


---

## 🙏 Acknowledgments

- **Groq** for providing the powerful AI API
- **Express.js** community for the robust framework
- **Netlify & Render** for excellent hosting platforms
- All contributors and users for support and feedback

---

<div align="center">

**Made with ❤️ by the NeuroStem Team**

⭐ If you find this project helpful, please consider starring the repository!

</div>
