import express from 'express';
import cors from 'cors';
import pkg from 'pg';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pkg;
const app = express();

// PostgreSQL connection
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'plato',
});

// Middleware
app.use(cors());
app.use(express.json());

// ==========================================
// OPENROUTER API CONFIGURATION
// ==========================================
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
console.log("OpenRouter API Key loaded:", OPENROUTER_API_KEY ? "✅" : "❌");


// Define LLM models for different purposes
const LLM_MODELS = {
  TUTOR: 'anthropic/claude-3.5-sonnet', // Best for detailed explanations (routes to Claude via OpenRouter)
  QUIZ_GENERATOR: 'openai/gpt-4o-mini', // Fast problem generation
  ANALYZER: 'google/gemini-2.0-flash-001', // Deep analysis of errors
  MOTIVATOR: 'anthropic/claude-3.5-sonnet', // Personality-driven feedback
};

// ==========================================
// AGENTIC LLM CALLER - Routes to OpenRouter
// ==========================================
async function callOpenRouterLLM(model, systemPrompt, userMessage, temperature = 0.7) {
  try {
    const response = await axios.post(
      `${OPENROUTER_BASE_URL}/chat/completions`,
      {
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: temperature,
        max_tokens: 500,
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://plato-hackathon.vercel.app',
          'X-Title': 'Plato Learning Platform',
        },
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error(`Error calling OpenRouter with model ${model}:`, error.message);
    throw error;
  }
}

// ==========================================
// DATABASE HELPERS
// ==========================================
async function getUserMastery(userId, topicId) {
  const result = await pool.query(
    'SELECT mastery_level FROM user_mastery WHERE user_id = $1 AND topic_id = $2',
    [userId, topicId]
  );
  return result.rows[0]?.mastery_level || 0;
}

async function getRecentQuizAttempts(userId, topicId, limit = 5) {
  const result = await pool.query(
    `SELECT score, correct_answers, total_questions, answers_given, timestamp 
     FROM quiz_attempts 
     WHERE user_id = $1 AND topic_id = $2 
     ORDER BY timestamp DESC LIMIT $3`,
    [userId, topicId, limit]
  );
  return result.rows;
}

async function getTopicPrerequisites(topicId) {
  const result = await pool.query(
    `SELECT t.id, t.name, t.difficulty_level 
     FROM topics t 
     JOIN topic_prerequisites tp ON t.id = tp.prerequisite_id 
     WHERE tp.topic_id = $1`,
    [topicId]
  );
  return result.rows;
}

// ==========================================
// CORE AGENTIC LOGIC - THE MAGIC
// ==========================================
/**
 * THE LEARNING AGENT
 * This is what makes your system "agentic" and wins the Aristotle challenge
 * 
 * It takes quiz results and DECIDES what to do next based on:
 * 1. Student's mastery level (memory from DB)
 * 2. Error patterns (analysis of what went wrong)
 * 3. Prerequisites (what they might be missing)
 * 4. Learning style (personalization)
 */
async function runLearningAgent(userId, topicId, quizScore, answers) {
  console.log(`[AGENT] Starting learning agent for user ${userId}, topic ${topicId}, score ${quizScore}`);

  // Step 1: Gather context
  const currentMastery = await getUserMastery(userId, topicId);
  const recentAttempts = await getRecentQuizAttempts(userId, topicId);
  const prerequisites = await getTopicPrerequisites(topicId);

  // Step 2: Analyze the quiz attempt
  const analysisPrompt = `
You are an expert educational tutor. A student just took a quiz with a score of ${quizScore}/100.

Their recent performance on this topic:
${recentAttempts.map((a) => `- Score: ${a.score}/100, ${a.correct_answers}/${a.total_questions} correct`).join('\n')}

Current mastery level: ${(currentMastery * 100).toFixed(0)}%

Student's answers: ${JSON.stringify(answers, null, 2)}

ANALYZE:
1. What specific concepts did the student struggle with?
2. What patterns do you see in their errors?
3. Are there gaps in prerequisite knowledge?

Be concise and actionable.
  `;

  const errorAnalysis = await callOpenRouterLLM(
    LLM_MODELS.ANALYZER,
    'You are an expert AI tutor analyzing student performance.',
    analysisPrompt,
    0.5
  );

  console.log('[AGENT] Error analysis complete:', errorAnalysis.substring(0, 100));

  // Step 3: DECISION POINT - What should happen next? (This is the "agentic" part)
  const decisionPrompt = `
Based on this analysis:
${errorAnalysis}

The student's mastery is at ${(currentMastery * 100).toFixed(0)}%.

DECIDE what the learning system should do:
1. DRILL: Generate more practice problems on the same topic
2. RETEACH: Go back and teach a prerequisite first
3. ADVANCE: Move to the next topic
4. REINFORCE: Review and solidify current understanding

Respond with ONLY one word: DRILL, RETEACH, ADVANCE, or REINFORCE
  `;

  const decision = await callOpenRouterLLM(
    LLM_MODELS.ANALYZER,
    'You are making adaptive learning decisions.',
    decisionPrompt,
    0.3 // Lower temperature for deterministic decisions
  );

  const adaptationDecision = decision.trim().toUpperCase();
  console.log('[AGENT] Adaptation decision:', adaptationDecision);

  // Step 4: Execute the decision
  let feedback = '';
  let followUpProblems = [];
  let nextAction = adaptationDecision;

  if (adaptationDecision === 'DRILL') {
    // Generate similar problems
    const problemPrompt = `
The student scored ${quizScore}/100 on this topic. They struggled with:
${errorAnalysis}

Generate 2-3 similar but different practice problems that target their weak areas.
Format as JSON array with objects like: { "problem": "...", "topic": "...", "difficulty": "hard/medium/easy" }
    `;

    const problemsJSON = await callOpenRouterLLM(
      LLM_MODELS.QUIZ_GENERATOR,
      'You are a quiz problem generator.',
      problemPrompt,
      0.8
    );

    try {
      followUpProblems = JSON.parse(problemsJSON);
    } catch {
      followUpProblems = [
        { problem: 'Practice similar problems to strengthen this concept', difficulty: 'medium' },
      ];
    }

    feedback = `Great effort! I see you're struggling with a few concepts. Let's drill deeper with these practice problems.`;
  } else if (adaptationDecision === 'RETEACH') {
    const prereqNames = prerequisites.map((p) => p.name).join(', ');
    feedback = `I notice you might benefit from reviewing: ${prereqNames}. Let's strengthen those foundations first!`;
    nextAction = prerequisites.length > 0 ? prerequisites[0].id : 'DRILL';
  } else if (adaptationDecision === 'ADVANCE') {
    feedback = `Excellent! You've mastered this concept. Ready to move forward to the next topic!`;
  } else {
    feedback = `You're making progress! Let's review and solidify what you've learned.`;
  }

  // Step 5: Store the session with decision rationale
  const sessionId = uuidv4();
  await pool.query(
    `INSERT INTO learning_sessions 
     (id, user_id, topic_id, llm_used, feedback_generated, follow_up_problems, adaptation_decision)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sessionId,
      userId,
      topicId,
      LLM_MODELS.ANALYZER,
      feedback,
      JSON.stringify(followUpProblems),
      `Decision: ${adaptationDecision}. Analysis: ${errorAnalysis.substring(0, 200)}...`,
    ]
  );

  // Update mastery
  const newMastery = Math.min(currentMastery + (quizScore / 100) * 0.15, 1.0);
  await pool.query(
    `INSERT INTO user_mastery (user_id, topic_id, mastery_level, last_reviewed)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, topic_id) 
     DO UPDATE SET mastery_level = $3, updated_at = CURRENT_TIMESTAMP`,
    [userId, topicId, newMastery]
  );

  return {
    decision: adaptationDecision,
    feedback,
    followUpProblems,
    errorAnalysis,
    newMastery: (newMastery * 100).toFixed(0),
    sessionId,
  };
}

// ==========================================
// API ENDPOINTS
// ==========================================

// Get or create user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const result = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (result.rows.length > 0) {
      return res.json({ userId: result.rows[0].id });
    }

    const newUser = await pool.query('INSERT INTO users (username) VALUES ($1) RETURNING id', [
      username,
    ]);
    res.json({ userId: newUser.rows[0].id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all subjects and topics (for sidebar)
app.get('/api/topics', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT s.id as subject_id, s.name as subject_name, 
             t.id as topic_id, t.name as topic_name, t.difficulty_level
      FROM subjects s
      LEFT JOIN topics t ON s.id = t.subject_id
      ORDER BY s.name, t.name
    `);

    // Format for frontend
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
    res.status(500).json({ error: err.message });
  }
});

// Get topic map (prerequisites visualization)
app.get('/api/topics/:topicId/map', async (req, res) => {
  const { topicId } = req.params;
  try {
    const topic = await pool.query('SELECT * FROM topics WHERE id = $1', [topicId]);
    const prerequisites = await pool.query(
      `SELECT t.id, t.name FROM topics t
       JOIN topic_prerequisites tp ON t.id = tp.prerequisite_id
       WHERE tp.topic_id = $1`,
      [topicId]
    );

    res.json({
      topic: topic.rows[0],
      prerequisites: prerequisites.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit quiz and run agent
app.post('/api/quiz/submit', async (req, res) => {
  const { userId, topicId, score, correctAnswers, totalQuestions, answersGiven } = req.body;

  try {
    // Store quiz attempt
    const quizId = uuidv4();
    await pool.query(
      `INSERT INTO quiz_attempts 
       (id, user_id, topic_id, score, correct_answers, total_questions, answers_given)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [quizId, userId, topicId, score, correctAnswers, totalQuestions, JSON.stringify(answersGiven)]
    );

    // RUN THE LEARNING AGENT
    const agentResult = await runLearningAgent(userId, topicId, score, answersGiven);

    res.json({
      quizId,
      ...agentResult,
    });
  } catch (err) {
    console.error('Error in quiz submission:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user progress dashboard
app.get('/api/users/:userId/progress', async (req, res) => {
  const { userId } = req.params;
  try {
    const mastery = await pool.query(
      `SELECT t.name, um.mastery_level, um.last_reviewed
       FROM user_mastery um
       JOIN topics t ON um.topic_id = t.id
       WHERE um.user_id = $1
       ORDER BY um.updated_at DESC`,
      [userId]
    );

    const recentSessions = await pool.query(
      `SELECT t.name, ls.adaptation_decision, ls.session_started
       FROM learning_sessions ls
       JOIN topics t ON ls.topic_id = t.id
       WHERE ls.user_id = $1
       ORDER BY ls.session_started DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      mastery: mastery.rows,
      recentSessions: recentSessions.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Plato learning agent is running' });
});

// Start server
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎓 Plato Learning Agent running on port ${PORT}`);
  console.log(`📡 OpenRouter API configured`);
});