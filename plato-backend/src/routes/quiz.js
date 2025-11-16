import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database.js';
import { runLearningAgent } from '../services/learningAgent.js';

const router = express.Router();

/**
 * POST /api/quiz/submit
 * Submit a quiz and run the learning agent
 */
router.post('/submit', async (req, res) => {
  const { userId, topicId, score, correctAnswers, totalQuestions, answersGiven } = req.body;

  // Validate input
  if (!userId || !topicId || score === undefined) {
    return res.status(400).json({
      error: 'Missing required fields: userId, topicId, score',
    });
  }

  try {
    // Store the quiz attempt
    const quizId = uuidv4();
    await pool.query(
      `INSERT INTO quiz_attempts 
       (id, user_id, topic_id, score, correct_answers, total_questions, answers_given)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        quizId,
        userId,
        topicId,
        score,
        correctAnswers || 0,
        totalQuestions || 0,
        JSON.stringify(answersGiven || []),
      ]
    );

    // RUN THE LEARNING AGENT
    console.log(`[AGENT] Starting learning agent for user ${userId}, topic ${topicId}`);
    const agentResult = await runLearningAgent(userId, topicId, score, answersGiven);

    res.json({
      quizId,
      success: true,
      ...agentResult,
    });
  } catch (err) {
    console.error('Error in POST /api/quiz/submit:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/quiz/attempts/:userId/:topicId
 * Get quiz history for a user on a specific topic
 */
router.get('/attempts/:userId/:topicId', async (req, res) => {
  const { userId, topicId } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, score, correct_answers, total_questions, timestamp
       FROM quiz_attempts
       WHERE user_id = $1 AND topic_id = $2
       ORDER BY timestamp DESC
       LIMIT 10`,
      [userId, topicId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error in GET /api/quiz/attempts:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;