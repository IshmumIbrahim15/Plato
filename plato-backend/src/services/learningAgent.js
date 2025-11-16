import pool from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import { callOpenRouterLLM, LLM_MODELS } from '../config/openrouter.js';
import { analyzeQuizErrors } from './quizAnalyzer.js';
import { makeAdaptiveDecision } from './decisionMaker.js';
import { generateFollowUpProblems } from './problemGenerator.js';

/**
 * THE LEARNING AGENT
 * This is the agentic core of Plato
 * 
 * It:
 * 1. Analyzes quiz performance
 * 2. Makes adaptive decisions (DRILL, RETEACH, ADVANCE, REINFORCE)
 * 3. Generates personalized follow-up content
 * 4. Updates user mastery in database
 * 5. Logs rationale for future learning
 */
export async function runLearningAgent(userId, topicId, quizScore, answers) {
  console.log(`[AGENT] Starting learning agent for user ${userId}, topic ${topicId}, score ${quizScore}`);

  try {
    // Step 1: Gather historical context
    const currentMastery = await getUserMastery(userId, topicId);
    const recentAttempts = await getRecentQuizAttempts(userId, topicId);
    const prerequisites = await getTopicPrerequisites(topicId);

    console.log(`[AGENT] Current mastery: ${(currentMastery * 100).toFixed(0)}%`);

    // Step 2: Analyze the quiz
    console.log(`[AGENT] Analyzing quiz errors...`);
    const errorAnalysis = await analyzeQuizErrors(
      quizScore,
      answers,
      recentAttempts,
      currentMastery
    );

    console.log(`[AGENT] Error analysis: ${errorAnalysis.substring(0, 100)}...`);

    // Step 3: Make adaptive decision
    console.log(`[AGENT] Making adaptive decision...`);
    const decision = await makeAdaptiveDecision(
      errorAnalysis,
      currentMastery,
      quizScore,
      prerequisites
    );

    console.log(`[AGENT] Decision: ${decision.type}`);

    // Step 4: Execute the decision
    let feedback = '';
    let followUpProblems = [];

    if (decision.type === 'DRILL') {
      feedback = decision.feedback;
      followUpProblems = await generateFollowUpProblems(
        errorAnalysis,
        topicId,
        'hard'
      );
    } else if (decision.type === 'RETEACH') {
      feedback = decision.feedback;
      // Don't generate problems for reteach
    } else if (decision.type === 'ADVANCE') {
      feedback = decision.feedback;
    } else {
      feedback = decision.feedback;
      followUpProblems = await generateFollowUpProblems(
        errorAnalysis,
        topicId,
        'medium'
      );
    }

    // Step 5: Update mastery
    const newMastery = calculateNewMastery(currentMastery, quizScore);
    await updateUserMastery(userId, topicId, newMastery);

    console.log(`[AGENT] Mastery updated: ${(currentMastery * 100).toFixed(0)}% → ${(newMastery * 100).toFixed(0)}%`);

    // Step 6: Store session
    const sessionId = uuidv4();
    await storeSession(
      sessionId,
      userId,
      topicId,
      decision.type,
      feedback,
      followUpProblems,
      errorAnalysis.substring(0, 200)
    );

    console.log(`[AGENT] Session stored: ${sessionId}`);

    return {
      decision: decision.type,
      feedback,
      followUpProblems,
      errorAnalysis,
      newMastery: (newMastery * 100).toFixed(0),
      sessionId,
    };
  } catch (error) {
    console.error('[AGENT] Error in learning agent:', error);
    throw error;
  }
}

/**
 * Helper: Get current mastery level for user on topic
 */
async function getUserMastery(userId, topicId) {
  const result = await pool.query(
    'SELECT mastery_level FROM user_mastery WHERE user_id = $1 AND topic_id = $2',
    [userId, topicId]
  );
  return result.rows[0]?.mastery_level || 0;
}

/**
 * Helper: Get recent quiz attempts
 */
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

/**
 * Helper: Get topic prerequisites
 */
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

/**
 * Helper: Calculate new mastery based on performance
 */
function calculateNewMastery(currentMastery, score) {
  const improvement = (score / 100) * 0.15; // Max 15% improvement per quiz
  return Math.min(currentMastery + improvement, 1.0);
}

/**
 * Helper: Update user mastery in database
 */
async function updateUserMastery(userId, topicId, masteryLevel) {
  await pool.query(
    `INSERT INTO user_mastery (user_id, topic_id, mastery_level, last_reviewed)
     VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
     ON CONFLICT (user_id, topic_id) 
     DO UPDATE SET mastery_level = $3, updated_at = CURRENT_TIMESTAMP`,
    [userId, topicId, masteryLevel]
  );
}

/**
 * Helper: Store learning session
 */
async function storeSession(
  sessionId,
  userId,
  topicId,
  decision,
  feedback,
  problems,
  rationale
) {
  await pool.query(
    `INSERT INTO learning_sessions 
     (id, user_id, topic_id, llm_used, feedback_generated, follow_up_problems, adaptation_decision)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      sessionId,
      userId,
      topicId,
      'multi-llm',
      feedback,
      JSON.stringify(problems),
      `Decision: ${decision}. Rationale: ${rationale}`,
    ]
  );
}

export {
  getUserMastery,
  getRecentQuizAttempts,
  getTopicPrerequisites,
};