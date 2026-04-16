const express = require('express');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/authMiddleware');
const { generateDistractors } = require('../utils/distractors');

const router = express.Router();
router.use(authMiddleware);

function selectWeightedWord(words, wordStats) {
  const statsMap = new Map(wordStats.map(s => [s.word, s]));
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const weighted = words.map(w => {
    const stat = statsMap.get(w.word);
    let weight = stat ? parseFloat(stat.weight) : 1.0;
    if (stat && stat.last_seen) {
      const age = now - new Date(stat.last_seen).getTime();
      if (age > ONE_DAY) weight *= 1.2;
    }
    return { word: w, weight: Math.max(weight, 0.05) };
  });

  const total = weighted.reduce((sum, w) => sum + w.weight, 0);
  let rnd = Math.random() * total;
  for (const item of weighted) {
    rnd -= item.weight;
    if (rnd <= 0) return item.word;
  }
  return weighted[weighted.length - 1].word;
}

router.get('/question', async (req, res) => {
  try {
    const allWords = (await query('SELECT * FROM vocabulary')).rows;
    if (allWords.length < 5)
      return res.status(503).json({ error: 'Not enough vocabulary loaded' });

    const wordStats = (await query('SELECT * FROM word_stats WHERE user_id = $1', [req.userId])).rows;
    const correctWord = selectWeightedWord(allWords, wordStats);
    const distractors = generateDistractors(correctWord, allWords, 4);

    if (distractors.length < 4) {
      const extras = allWords
        .filter(w => w.word !== correctWord.word && !distractors.some(d => d.word === w.word))
        .sort(() => Math.random() - 0.5)
        .slice(0, 4 - distractors.length);
      distractors.push(...extras);
    }

    const options = [...distractors, correctWord].sort(() => Math.random() - 0.5);

    await query(`
      INSERT INTO pending_questions (user_id, correct_word, question_data)
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id) DO UPDATE SET
        correct_word = EXCLUDED.correct_word,
        question_data = EXCLUDED.question_data,
        created_at = CURRENT_TIMESTAMP
    `, [req.userId, correctWord.word, JSON.stringify({ word: correctWord.word, definition: correctWord.definition })]);

    res.json({
      questionId: `${req.userId}_${Date.now()}`,
      definition: correctWord.definition,
      example: correctWord.example || null,
      options: options.map(o => ({ word: o.word, translation: o.translation || null }))
    });
  } catch (err) {
    console.error('Question error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/answer', async (req, res) => {
  const { selectedWord } = req.body;
  if (!selectedWord) return res.status(400).json({ error: 'selectedWord required' });

  try {
    const pendingResult = await query('SELECT * FROM pending_questions WHERE user_id = $1', [req.userId]);
    const pending = pendingResult.rows[0];
    if (!pending) return res.status(400).json({ error: 'No active question found' });

    const isCorrect = selectedWord === pending.correct_word;
    const correctWord = pending.correct_word;

    const vocabResult = await query('SELECT * FROM vocabulary WHERE word = $1', [correctWord]);
    const vocabData = vocabResult.rows[0];

    const userResult = await query('SELECT * FROM users WHERE id = $1', [req.userId]);
    const user = userResult.rows[0];
    const newStreak = isCorrect ? user.current_streak + 1 : 0;
    const newMax = Math.max(user.max_streak, newStreak);

    await query(`
      UPDATE users SET
        current_streak = $1,
        max_streak = $2,
        total_correct = total_correct + $3,
        total_incorrect = total_incorrect + $4,
        last_seen = CURRENT_TIMESTAMP
      WHERE id = $5
    `, [newStreak, newMax, isCorrect ? 1 : 0, isCorrect ? 0 : 1, req.userId]);

    const existingResult = await query(
      'SELECT * FROM word_stats WHERE user_id = $1 AND word = $2',
      [req.userId, correctWord]
    );
    const existing = existingResult.rows[0];
    let newWeight;

    if (existing) {
      newWeight = isCorrect
        ? Math.max(parseFloat(existing.weight) * 0.7, 0.3)
        : Math.min(parseFloat(existing.weight) * 1.8, 6.0);
      await query(`
        UPDATE word_stats SET
          correct_count = correct_count + $1,
          incorrect_count = incorrect_count + $2,
          weight = $3,
          last_seen = CURRENT_TIMESTAMP
        WHERE user_id = $4 AND word = $5
      `, [isCorrect ? 1 : 0, isCorrect ? 0 : 1, newWeight, req.userId, correctWord]);
    } else {
      newWeight = isCorrect ? 0.7 : 1.8;
      await query(`
        INSERT INTO word_stats (user_id, word, correct_count, incorrect_count, weight, last_seen)
        VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
      `, [req.userId, correctWord, isCorrect ? 1 : 0, isCorrect ? 0 : 1, newWeight]);
    }

    await query('DELETE FROM pending_questions WHERE user_id = $1', [req.userId]);

    res.json({
      correct: isCorrect,
      correctWord,
      definition: vocabData ? vocabData.definition : '',
      translation: vocabData ? vocabData.translation : '',
      synonyms: vocabData ? vocabData.synonyms : '',
      example: vocabData ? vocabData.example : '',
      streak: newStreak,
      maxStreak: newMax,
    });
  } catch (err) {
    console.error('Answer error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/save', async (req, res) => {
  try {
    await query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [req.userId]);
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const result = await query(
      'SELECT id, username, current_streak, max_streak, total_correct, total_incorrect FROM users WHERE id = $1',
      [req.userId]
    );
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
