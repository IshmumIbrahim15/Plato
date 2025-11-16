import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';

const router = express.Router();

/**
 * POST /api/users
 * Create a new user or get existing user
 */
router.post('/', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.json({ userId: existingUser.rows[0].id });
    }

    // Create new user
    const userId = uuidv4();
    await pool.query(
      'INSERT INTO users (id, username) VALUES ($1, $2)',
      [userId, username]
    );

    res.json({ userId });
  } catch (err) {
    console.error('Error in POST /api/users:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/users/:userId
 * Get user information
 */
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT id, username, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error in GET /api/users/:userId:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;