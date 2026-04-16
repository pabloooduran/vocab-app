const { Pool } = require('pg');
const path = require('path');
const fs = require('fs');

let pool;

function getPool() {
  if (!pool) {
    const ssl = process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
      ? { rejectUnauthorized: false }
      : (process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false);

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl,
    });
  }
  return pool;
}

async function query(sql, params = []) {
  return getPool().query(sql, params);
}

async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      current_streak INTEGER DEFAULT 0,
      max_streak INTEGER DEFAULT 0,
      total_correct INTEGER DEFAULT 0,
      total_incorrect INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS word_stats (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      correct_count INTEGER DEFAULT 0,
      incorrect_count INTEGER DEFAULT 0,
      weight FLOAT DEFAULT 1.0,
      last_seen TIMESTAMP,
      UNIQUE(user_id, word)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS pending_questions (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      correct_word TEXT NOT NULL,
      question_data TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS vocabulary (
      id SERIAL PRIMARY KEY,
      word TEXT UNIQUE NOT NULL,
      definition TEXT NOT NULL,
      translation TEXT,
      synonyms TEXT,
      example TEXT
    )
  `);

  await seedVocabulary();
  console.log('Database initialized.');
}

async function seedVocabulary() {
  const result = await query('SELECT COUNT(*) as cnt FROM vocabulary');
  if (parseInt(result.rows[0].cnt) > 0) return;

  const vocabPath = path.join(__dirname, '..', 'data', 'gre_vocab.json');
  if (!fs.existsSync(vocabPath)) {
    console.warn('Vocabulary JSON not found.');
    return;
  }

  try {
    const raw = fs.readFileSync(vocabPath, 'utf8');
    const words = JSON.parse(raw);

    // Batch insert in chunks of 100
    const CHUNK = 100;
    let seeded = 0;
    for (let i = 0; i < words.length; i += CHUNK) {
      const chunk = words.slice(i, i + CHUNK);
      const values = [];
      const placeholders = [];
      let idx = 1;

      for (const item of chunk) {
        const word = (item.word || '').trim();
        const definition = (item.definition || '').trim();
        if (!word || !definition) continue;

        const synonyms = Array.isArray(item.synonyms)
          ? item.synonyms.join(',')
          : (item.synonyms || '');

        placeholders.push(`($${idx++}, $${idx++}, $${idx++}, $${idx++}, $${idx++})`);
        values.push(word, definition, item.translation || '', synonyms, item.example || '');
      }

      if (placeholders.length > 0) {
        await query(
          `INSERT INTO vocabulary (word, definition, translation, synonyms, example)
           VALUES ${placeholders.join(',')}
           ON CONFLICT (word) DO NOTHING`,
          values
        );
        seeded += placeholders.length;
      }
    }
    console.log(`Seeded ${seeded} vocabulary words.`);
  } catch (err) {
    console.error('Failed to seed vocabulary:', err.message);
  }
}

module.exports = { query, initializeDatabase };
