# Vocab app

A web application for studying english vocabulary through adaptive multiple-choice questions. Built with React, Node.js/Express, and PostgreSQL. Deployed on Vercel (frontend), Render (backend) and Neon (database), all on free plans.

**Live app:** https://vocab-app-two-pi.vercel.app

> The backend runs on Render's free plan and sleeps after 15 minutes without traffic. The app pings it as soon as it opens, but the first sign-in after a quiet period can still take up to a minute.

---

## Features

- **Adaptive repetition** — Words are weighted by performance. Words you get wrong appear more frequently; mastered words appear less.
- **Smart distractors** — Wrong answer options are chosen from the same semantic cluster as the correct word, avoiding trivially easy choices.
- **Streak tracking** — Tracks your current and best consecutive correct answer streak, with visual feedback that intensifies as your streak grows.
- **Per-word statistics** — See your correct/incorrect counts for every word you have studied, with filters (all, needs work, mastered).
- **Multi-user** — Each user has their own account, progress, and statistics.
- **Try the demo** — One click creates a temporary guest account, so visitors can play without signing up. Guest accounts and their stats are deleted automatically after 7 days.
- **Cross-device** — Works on any device with a browser. Progress is stored in the cloud.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5, CSS Modules |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Neon) |
| Auth | JWT (30-day tokens), bcrypt password hashing |
| Frontend hosting | Vercel |
| Backend hosting | Render |

---

## Project Structure

```
gre-vocab-app/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express server, CORS, routing
│   │   ├── db/
│   │   │   └── database.js         # PostgreSQL connection pool, schema init, vocabulary seeding
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   # JWT validation middleware
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /register, POST /login
│   │   │   ├── game.js             # GET /question, POST /answer, PUT /save, GET /me
│   │   │   └── stats.js            # GET /stats
│   │   ├── utils/
│   │   │   └── distractors.js      # Semantic clustering & distractor selection algorithm
│   │   └── data/
│   │       └── gre_vocab.json      # ~1,080 GRE words with definitions, translations, synonyms
│   ├── .env.example
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx                 # Router with protected routes
│   │   ├── main.jsx                # React entry point
│   │   ├── index.css               # Global styles
│   │   ├── context/
│   │   │   └── AuthContext.jsx     # Auth state, token persistence in localStorage
│   │   ├── services/
│   │   │   └── api.js              # HTTP client with JWT injection
│   │   └── components/
│   │       ├── Auth/               # Login and register screens
│   │       ├── Dashboard/          # Home screen with stats and streak display
│   │       ├── Game/               # Game loop: question → answer → feedback
│   │       └── Stats/              # Word-by-word history with filters
│   ├── .env.production             # VITE_API_URL pointing to the Render backend
│   ├── vite.config.js
│   └── package.json
│
└── .gitignore
```

---

## Architecture

```
Browser
  │
  ▼
Vercel  ─── React SPA (static)
  │
  │  HTTPS requests to /api/*
  ▼
Render  ─── Express REST API
  │
  │  PostgreSQL connection (pooled, TLS)
  ▼
Neon  ─── PostgreSQL database
```

The frontend is a static React SPA hosted on Vercel. It communicates with the Express backend on Render via HTTPS. All user data and vocabulary are stored in PostgreSQL on Neon.

---

## Database Schema

```sql
-- User accounts and aggregate stats
users (
  id              SERIAL PRIMARY KEY,
  username        TEXT UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,           -- bcrypt
  current_streak  INTEGER DEFAULT 0,
  max_streak      INTEGER DEFAULT 0,
  total_correct   INTEGER DEFAULT 0,
  total_incorrect INTEGER DEFAULT 0,
  created_at      TIMESTAMP DEFAULT NOW(),
  last_seen       TIMESTAMP DEFAULT NOW()
)

-- Per-user performance per word (drives adaptive weighting)
word_stats (
  id              SERIAL PRIMARY KEY,
  user_id         INTEGER REFERENCES users(id) ON DELETE CASCADE,
  word            TEXT NOT NULL,
  correct_count   INTEGER DEFAULT 0,
  incorrect_count INTEGER DEFAULT 0,
  weight          FLOAT DEFAULT 1.0,       -- 0.3 (mastered) → 6.0 (struggling)
  last_seen       TIMESTAMP,
  UNIQUE(user_id, word)
)

-- Stores the pending question server-side for tamper-proof answer validation
pending_questions (
  user_id       INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  correct_word  TEXT NOT NULL,
  question_data TEXT NOT NULL,             -- JSON
  created_at    TIMESTAMP DEFAULT NOW()
)

-- Static GRE vocabulary list (~1,080 words, seeded on first run)
vocabulary (
  id          SERIAL PRIMARY KEY,
  word        TEXT UNIQUE NOT NULL,
  definition  TEXT NOT NULL,
  translation TEXT,                        -- Spanish
  synonyms    TEXT,                        -- comma-separated
  example     TEXT
)
```

---

## Adaptive Repetition Algorithm

Each word has a `weight` (default `1.0`) per user stored in `word_stats`. Words are selected using weighted random sampling across all vocabulary.

| Event | Weight change |
|---|---|
| Correct answer | `weight × 0.7` (minimum 0.3) |
| Wrong answer | `weight × 1.8` (maximum 6.0) |
| Not seen in 24h | `weight × 1.2` (re-exposure boost) |

A word you have mastered (weight 0.3) is 20× less likely to appear than a word you are struggling with (weight 6.0).

---

## Distractor Generation

Wrong answer options are generated by `backend/src/utils/distractors.js` using a two-layer filter:

**Layer 1 — Semantic clusters.** ~50 hand-curated clusters group semantically related words (e.g. all "talkative" words: loquacious, garrulous, verbose, voluble, prolix). Words in the same cluster as the correct answer are excluded from distractors.

**Layer 2 — Synonym overlap.** Each vocabulary entry has synonyms. If a candidate distractor shares a synonym with the correct word, it is excluded. This catches related pairs not covered by any explicit cluster.

The remaining candidate pool is shuffled and the first 4 valid candidates are selected. If fewer than 4 are found, random words fill the remaining slots.

---

## API Reference

All `/api/game/*` and `/api/stats/*` endpoints require an `Authorization: Bearer <token>` header.

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/auth/register` | `{ username, password }` | Create account, returns JWT and user object |
| POST | `/api/auth/login` | `{ username, password }` | Login, returns JWT and user object |
| POST | `/api/auth/guest` | — | Creates a temporary guest account (7 days), returns JWT and user object |

Validation: username 3–30 characters, password minimum 6 characters.

### Game

| Method | Endpoint | Body | Description |
|---|---|---|---|
| GET | `/api/game/question` | — | Returns `{ definition, example, options: [{ word, translation }] }` |
| POST | `/api/game/answer` | `{ selectedWord }` | Returns `{ correct, correctWord, definition, translation, synonyms, example, streak, maxStreak }` |
| PUT | `/api/game/save` | — | Updates `last_seen` (called on exit) |
| GET | `/api/game/me` | — | Returns current user profile |

### Stats

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/stats` | Returns aggregate stats and per-word history sorted by error count |

### Health

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Returns `{ status: "ok" }` |

---

## Streak Levels

| Streak | Visual |
|---|---|
| 0–4 | Neutral sand badge |
| 5–9 | Pulsing amber glow |
| 10–19 | Shimmer gold animation |
| 20+ | Radiant intense gold |

---

## Local Development

### Prerequisites

- Node.js 18+
- A PostgreSQL database (local install or a free Neon project)

### Backend

```bash
cd backend
npm install
```

Create `backend/.env` (see `backend/.env.example`):
```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=any_random_string_here
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
PORT=3001
```

```bash
npm run dev
```

Starts on http://localhost:3001. On first run it creates all tables and seeds ~1,080 vocabulary words automatically.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Starts on http://localhost:5173. API requests are proxied to http://localhost:3001 in dev mode via `vite.config.js`.

---

## Deployment

### Database — Neon

1. Create a free project at [neon.com](https://neon.com) (no credit card needed)
2. Click **Connect** and copy the connection string with **Connection pooling** enabled

The free plan suspends the database after 5 minutes of inactivity and resumes it automatically on the next connection.

### Backend — Render

The backend is defined as a Render Blueprint in [`render.yaml`](render.yaml) (free plan, `backend/` as root directory, region Ohio next to the database).

1. In [Render](https://render.com), click **New → Blueprint** and select this repo
2. Paste the Neon connection string when asked for `DATABASE_URL`

`JWT_SECRET` is generated automatically, and `FRONTEND_URL` / `NODE_ENV` are set in `render.yaml`. Every push that touches `backend/` redeploys the service.

### Frontend — Vercel

1. Import this repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Vite — no additional configuration needed
4. The `frontend/.env.production` file already contains the Render backend URL as `VITE_API_URL`

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret used to sign JWT tokens |
| `FRONTEND_URL` | Yes | Vercel app URL, used for CORS |
| `NODE_ENV` | Yes | `production` or `development` |
| `PORT` | No | Server port (default 3001) |

### Frontend (`frontend/.env.production`)

| Variable | Required | Description |
|---|---|---|
| `VITE_API_URL` | No | Backend base URL. Omit for local dev (proxied automatically). Set to the Render URL for production builds. |
