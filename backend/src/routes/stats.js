const express = require('express');
const { query } = require('../db/database');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
router.use(authMiddleware);

router.get('/', async (req, res) => {
  try {
    const userResult = await query(
      'SELECT id, username, current_streak, max_streak, total_correct, total_incorrect FROM users WHERE id = $1',
      [req.userId]
    );
    const user = userResult.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });

    const wordStats = (await query(`
      SELECT ws.word, ws.correct_count, ws.incorrect_count, ws.weight, ws.last_seen,
             v.definition, v.translation
      FROM word_stats ws
      JOIN vocabulary v ON v.word = ws.word
      WHERE ws.user_id = $1
      ORDER BY ws.incorrect_count DESC, ws.correct_count ASC
    `, [req.userId])).rows;

    const totalWords = parseInt((await query('SELECT COUNT(*) as cnt FROM vocabulary')).rows[0].cnt);

    res.json({
      user,
      totalWords,
      wordStats,
      studied: wordStats.length,
      accuracy: user.total_correct + user.total_incorrect > 0
        ? Math.round((user.total_correct / (user.total_correct + user.total_incorrect)) * 100)
        : 0
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
