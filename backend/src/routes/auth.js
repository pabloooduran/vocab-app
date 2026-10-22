const crypto = require('crypto');
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, deleteOldGuests, GUEST_TTL_DAYS } = require('../db/database');

const router = express.Router();

const GUEST_PREFIX = /^guest-/i;

// "Try the demo": creates a fresh, temporary account so visitors can play without signing up.
router.post('/guest', async (req, res) => {
  try {
    await deleteOldGuests();

    // Random password nobody knows: guest accounts can only be used through the returned token
    const hash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

    let userId;
    let username;
    for (let attempt = 0; attempt < 3 && !userId; attempt++) {
      username = `Guest-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const result = await query(
        `INSERT INTO users (username, password_hash, is_guest) VALUES ($1, $2, TRUE)
         ON CONFLICT (username) DO NOTHING RETURNING id`,
        [username, hash]
      );
      userId = result.rows[0]?.id;
    }
    if (!userId) return res.status(503).json({ error: 'Could not start the demo, please try again' });

    const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: `${GUEST_TTL_DAYS}d` });

    res.status(201).json({
      token,
      user: { id: userId, username, is_guest: true, current_streak: 0, max_streak: 0, total_correct: 0, total_incorrect: 0 }
    });
  } catch (err) {
    console.error('Guest error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3 || username.length > 30)
    return res.status(400).json({ error: 'Username must be 3–30 characters' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (GUEST_PREFIX.test(username))
    return res.status(400).json({ error: 'That username is reserved, please choose another' });

  try {
    const existing = await query('SELECT id FROM users WHERE username = $1', [username]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: 'Username already taken' });

    const hash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id',
      [username, hash]
    );
    const userId = result.rows[0].id;

    const token = jwt.sign({ userId, username }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({
      token,
      user: { id: userId, username, current_streak: 0, max_streak: 0, total_correct: 0, total_incorrect: 0 }
    });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Username and password required' });

  try {
    const result = await query('SELECT * FROM users WHERE username = $1', [username]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    await query('UPDATE users SET last_seen = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        current_streak: user.current_streak,
        max_streak: user.max_streak,
        total_correct: user.total_correct,
        total_incorrect: user.total_incorrect
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
