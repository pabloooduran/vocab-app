# GRE Vocab Game

A full-stack GRE vocabulary study app with adaptive repetition, smart distractors, streak tracking, and per-user statistics.

---

## Requirements

- Node.js 18+
- The file `gre_vocab.json` must exist at `c:\Users\FX517\Practicas\gre_vocab.json`

---

## Setup & Run

### 1. Install backend dependencies

```bash
cd gre-vocab-app/backend
npm install
```

### 2. Install frontend dependencies

```bash
cd gre-vocab-app/frontend
npm install
```

### 3. Start backend (terminal 1)

```bash
cd gre-vocab-app/backend
npm run dev
```

Runs on `http://localhost:3001`. On first run it creates `gre_vocab.db` and seeds all vocabulary words.

### 4. Start frontend (terminal 2)

```bash
cd gre-vocab-app/frontend
npm run dev
```

Opens at `http://localhost:5173`.

---

## Architecture

```
gre-vocab-app/
├── backend/
│   ├── src/
│   │   ├── app.js                  # Express entry point
│   │   ├── db/database.js          # SQLite init + vocab seeding
│   │   ├── middleware/
│   │   │   └── authMiddleware.js   # JWT verification
│   │   ├── routes/
│   │   │   ├── auth.js             # POST /register, POST /login
│   │   │   ├── game.js             # GET /question, POST /answer, PUT /save
│   │   │   └── stats.js            # GET /stats
│   │   └── utils/
│   │       └── distractors.js      # Semantic cluster + synonym filtering
│   └── package.json
└── frontend/
    └── src/
        ├── App.jsx                 # Router + auth guards
        ├── context/AuthContext.jsx # Auth state (login/register/logout)
        ├── services/api.js         # fetch wrapper
        └── components/
            ├── Auth/               # Login / register screen
            ├── Dashboard/          # Home screen with stats
            ├── Game/               # Game loop + streak display
            └── Stats/              # Word-by-word history
```

---

## How the Distractor Algorithm Works

Bad distractors make a vocabulary quiz useless — if you know "verbose" means wordy, seeing "loquacious" as an option is a giveaway.

Two-layer filtering in `backend/src/utils/distractors.js`:

**Layer 1 — Semantic clusters.** ~50 hand-curated clusters group semantically related words (e.g., all "talkative" words: loquacious, garrulous, verbose, voluble, prolix). Any word in the same cluster as the correct answer is excluded from distractors.

**Layer 2 — Synonym overlap.** Each vocabulary entry has 2 synonyms. If a candidate distractor shares a synonym with the correct word, it's excluded. This catches pairs not in any explicit cluster.

The pool is shuffled first for variety, then the first 4 valid candidates are selected.

---

## How Adaptive Repetition Works

Each word has a float `weight` (default `1.0`) per user stored in `word_stats`.

- **Correct answer:** `weight = max(weight × 0.7, 0.3)` — word becomes less likely to appear
- **Wrong answer:** `weight = min(weight × 1.8, 6.0)` — word becomes up to 6× more likely
- **Recency bonus:** +20% weight if the word hasn't appeared in 24h, ensuring coverage of unseen words

Word selection uses weighted random sampling across all vocabulary words.

---

## Data Model

```sql
users           -- id, username, password_hash, current_streak, max_streak, total_correct, total_incorrect
word_stats      -- user_id, word, correct_count, incorrect_count, weight, last_seen
pending_questions -- user_id, correct_word, question_data  (server-side answer key)
vocabulary      -- word, definition, translation, synonyms, example
```

`pending_questions` stores the correct answer server-side so the client cannot cheat by inspecting the question payload.

---

## Streak Levels

| Streak | Visual effect |
|--------|---------------|
| 0–4    | Neutral sand badge |
| 5–9    | Pulsing amber glow |
| 10–19  | Shimmer gold animation |
| 20+    | Radiant intense gold |
