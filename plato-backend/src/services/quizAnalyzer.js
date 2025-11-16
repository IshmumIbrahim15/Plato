import { callOpenRouterLLM, LLM_MODELS } from '../config/openrouter.js';

/**
 * Analyze quiz errors using AI
 * Uses Gemini for fast pattern recognition
 */
export async function analyzeQuizErrors(score, answers, recentAttempts, currentMastery) {
  const analysisPrompt = `
You are an expert educational tutor analyzing student performance.

Quiz Results:
- Score: ${score}/100
- Student answers: ${JSON.stringify(answers)}
- Recent performance: ${recentAttempts.map((a) => `${a.score}%`).join(', ')}
- Current mastery: ${(currentMastery * 100).toFixed(0)}%

ANALYZE:
1. What specific concepts did the student struggle with?
2. What patterns do you see in the errors?
3. Are there prerequisite knowledge gaps?
4. Is this a one-time mistake or a consistent pattern?

Be concise and actionable. Focus on what to teach next.
  `;

  try {
    const analysis = await callOpenRouterLLM(
      LLM_MODELS.ANALYZER,
      'You are an expert AI tutor analyzing student quiz performance. Identify specific learning gaps and patterns.',
      analysisPrompt,
      0.5 // Lower temperature for consistent analysis
    );

    return analysis;
  } catch (error) {
    console.error('Error analyzing quiz:', error);
    // Fallback analysis
    if (score < 50) {
      return 'Student scored below 50%. Significant gaps in this topic detected. Recommend reteaching fundamentals.';
    } else if (score < 70) {
      return 'Student scored between 50-70%. Mixed understanding. Recommend targeted practice on weak areas.';
    } else {
      return 'Student performed well. Ready for advanced topics or consolidation.';
    }
  }
}

export default analyzeQuizErrors;