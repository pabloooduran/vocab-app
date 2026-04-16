# GRE Vocab

A web application for studying GRE vocabulary through adaptive multiple-choice questions. Built with React, Node.js/Express, and PostgreSQL. Deployed on Vercel (frontend) and Railway (backend).

**Live app:** https://vocab-app-two-pi.vercel.app

---

## Features

- **Adaptive repetition** — Words are weighted by performance. Words you get wrong appear more frequently; mastered words appear less.
- **Smart distractors** — Wrong answer options are chosen from the same semantic cluster as the correct word, avoiding trivially easy choices.
- **Streak tracking** — Tracks your current and best consecutive correct answer streak, with visual feedback that intensifies as your streak grows.
- **Per-word statistics** — See your correct/incorrect counts for every word you have studied, with filters (all, needs work, mastered).
- **Multi-user** — Each user has their own account, progress, and statistics.
- **Cross-device** — Works on any device with a browser. Progress is stored in the cloud.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, React Router v6, Vite 5, CSS Modules |
| Backend | Node.js, Express.js |
| Database | PostgreSQL (Supabase) |
| Auth | JWT (30-day tokens), bcrypt password hashing |
| Frontend hosting | Vercel |
| Backend hosting | Railway |

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
│   │       └── gre_vocab.json      # ~2700 GRE words with definitions, translations, synonyms
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
│   ├── .env.production             # VITE_API_URL pointing to Railway backend
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
Railway  ─── Express REST API
  │
  │  PostgreSQL connection (Session Pooler)
  ▼
Supabase  ─── PostgreSQL database
```

The frontend is a static React SPA hosted on Vercel. It communicates with the Express backend on Railway via HTTPS. All user data and vocabulary are stored in PostgreSQL on Supabase.

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

-- Static GRE vocabulary list (~2700 words, seeded on first run)
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
- A PostgreSQL database (local install or free Supabase project)

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

Starts on http://localhost:3001. On first run it creates all tables and seeds ~2700 vocabulary words automatically.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Starts on http://localhost:5173. API requests are proxied to http://localhost:3001 in dev mode via `vite.config.js`.

---

## Deployment

### Database — Supabase

1. Create a free project at [supabase.com](https://supabase.com)
2. Go to **Connect** → expand **"Some platforms are IPv4-only"** → select **Session pooler**
3. Copy the connection string and replace `[YOUR-PASSWORD]`

> **Important:** Use the Session Pooler URL (`pooler.supabase.com`), not the direct connection URL. Railway uses IPv4 and the direct Supabase URL resolves to IPv6 only.

### Backend — Railway

1. Create a new project at [railway.app](https://railway.app) connected to this GitHub repo
2. In **Settings**, set **Root Directory** to `/backend`
3. In **Settings → Networking**, verify the public domain routes to the port shown in the deploy logs
4. Add environment variables:

```env
DATABASE_URL=<supabase session pooler URL>
JWT_SECRET=<random secret string>
FRONTEND_URL=<your Vercel URL>
NODE_ENV=production
```

### Frontend — Vercel

1. Import this repo at [vercel.com](https://vercel.com)
2. Set **Root Directory** to `frontend`
3. Vercel auto-detects Vite — no additional configuration needed
4. The `frontend/.env.production` file already contains the Railway backend URL as `VITE_API_URL`

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
| `VITE_API_URL` | No | Backend base URL. Omit for local dev (proxied automatically). Set to Railway URL for production builds. |
