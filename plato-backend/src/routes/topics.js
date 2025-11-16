import express from 'express';
import pool from '../config/database.js';

const router = express.Router();

/**
 * GET /api/topics
 * Get all subjects and topics for the sidebar
 */
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id as subject_id, s.name as subject_name, 
             t.id as topic_id, t.name as topic_name, t.difficulty_level
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      ORDER BY s.name, t.name
    `);

    // Format response by subject
    const grouped = {};
    result.rows.forEach((row) => {
      if (!grouped[row.subject_name]) {
        grouped[row.subject_name] = [];
      }
      if (row.topic_id) {
        grouped[row.subject_name].push({
          id: row.topic_id,
          name: row.topic_name,
          difficulty: row.difficulty_level,
        });
      }
    });

    res.json(grouped);
  } catch (err) {
    console.error('Error in GET /api/topics:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/topics/:topicId/map
 * Get topic prerequisites (for visualization)
 */
router.get('/:topicId/map', async (req, res) => {
  const { topicId } = req.params;

  try {
    // Get the main topic
    const topicResult = await pool.query(
      'SELECT id, name, description, difficulty_level FROM topics WHERE id = $1',
      [topicId]
    );

    if (topicResult.rows.length === 0) {
      return res.status(404).json({ error: 'Topic not found' });
    }

    // Get prerequisites
    const prereqResult = await pool.query(
      `SELECT t.id, t.name FROM topics t
       JOIN topic_prerequisites tp ON t.id = tp.prerequisite_id
       WHERE tp.topic_id = $1
       ORDER BY t.name`,
      [topicId]
    );

    // Get topics that depend on this one
    const dependentsResult = await pool.query(
      `SELECT t.id, t.name FROM topics t
       JOIN topic_prerequisites tp ON t.id = tp.topic_id
       WHERE tp.prerequisite_id = $1
       ORDER BY t.name`,
      [topicId]
    );

    res.json({
      topic: topicResult.rows[0],
      prerequisites: prereqResult.rows,
      dependents: dependentsResult.rows,
    });
  } catch (err) {
    console.error('Error in GET /api/topics/:topicId/map:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;