import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * GET /api/users/:userId/progress
 * Get user's mastery levels and recent sessions
 */
router.get('/:userId/progress', async (req, res) => {
  const { userId } = req.params;

  try {
    // Get mastery levels for all topics
    const masteryResult = await pool.query(
      `SELECT t.id, t.name, um.mastery_level, um.last_reviewed
       FROM user_mastery um
       JOIN topics t ON um.topic_id = t.id
       WHERE um.user_id = $1
       ORDER BY um.updated_at DESC`,
      [userId]
    );

    // Get recent learning sessions
    const sessionsResult = await pool.query(
      `SELECT t.id, t.name, ls.adaptation_decision, ls.session_started, ls.feedback_generated
       FROM learning_sessions ls
       JOIN topics t ON ls.topic_id = t.id
       WHERE ls.user_id = $1
       ORDER BY ls.session_started DESC
       LIMIT 10`,
      [userId]
    );

    // Get overall stats
    const statsResult = await pool.query(
      `SELECT 
         COUNT(DISTINCT topic_id) as topics_attempted,
         AVG(score) as average_score,
         MAX(score) as highest_score,
         MIN(score) as lowest_score
       FROM quiz_attempts
       WHERE user_id = $1`,
      [userId]
    );

    res.json({
      mastery: masteryResult.rows,
      recentSessions: sessionsResult.rows,
      stats: statsResult.rows[0] || {
        topics_attempted: 0,
        average_score: null,
        highest_score: null,
        lowest_score: null,
      },
    });
  } catch (err) {
    console.error('Error in GET /api/users/:userId/progress:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;