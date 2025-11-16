import { callOpenRouterLLM, LLM_MODELS } from '../config/openrouter.js';

/**
 * Generate follow-up problems based on error analysis
 * Uses GPT-4 for creative problem generation
 */
export async function generateFollowUpProblems(errorAnalysis, topicId, difficulty = 'medium') {
  const problemPrompt = `
A student just completed a quiz with gaps in their understanding:

${errorAnalysis}

Generate 2-3 practice problems that directly target their weak areas.
Focus on: ${difficulty} difficulty level

Format your response as a JSON array with this structure:
[
  {
    "problem": "The actual problem statement",
    "topic": "Specific concept being tested",
    "difficulty": "easy/medium/hard",
    "hint": "A helpful hint if they get stuck"
  }
]

Make sure the problems are DIFFERENT from typical textbook questions.
Include real-world applications when possible.
Ensure problems specifically target the gaps identified above.

Respond ONLY with valid JSON array, no other text.
  `;

  try {
    const response = await callOpenRouterLLM(
      LLM_MODELS.QUIZ_GENERATOR,
      'You are an expert problem generator for adaptive learning. Create targeted practice problems.',
      problemPrompt,
      0.8 // Higher temperature for creative variation
    );

    // Parse JSON response
    try {
      const problems = JSON.parse(response);
      if (Array.isArray(problems) && problems.length > 0) {
        return problems.slice(0, 3); // Limit to 3 problems
      }
    } catch (parseError) {
      console.error('Failed to parse problems JSON:', parseError);
      // Return fallback problems
      return getFallbackProblems(difficulty);
    }

    return getFallbackProblems(difficulty);
  } catch (error) {
    console.error('Error generating problems:', error);
    return getFallbackProblems(difficulty);
  }
}

/**
 * Fallback problems if generation fails
 */
function getFallbackProblems(difficulty) {
  const problems = {
    easy: [
      {
        problem: 'Practice problem 1: Basic understanding check',
        topic: 'Fundamentals',
        difficulty: 'easy',
        hint: 'Review the core concepts from the lesson',
      },
      {
        problem: 'Practice problem 2: Simple application',
        topic: 'Application',
        difficulty: 'easy',
        hint: 'Apply what you learned in a straightforward way',
      },
    ],
    medium: [
      {
        problem: 'Practice problem 1: Standard problem',
        topic: 'Core Concept',
        difficulty: 'medium',
        hint: 'Consider how the concepts interact',
      },
      {
        problem: 'Practice problem 2: Problem with twist',
        topic: 'Application',
        difficulty: 'medium',
        hint: 'Think about edge cases and exceptions',
      },
    ],
    hard: [
      {
        problem: 'Challenge problem 1: Complex scenario',
        topic: 'Advanced',
        difficulty: 'hard',
        hint: 'Break down the problem into smaller parts',
      },
      {
        problem: 'Challenge problem 2: Multi-step solution',
        topic: 'Synthesis',
        difficulty: 'hard',
        hint: 'Combine multiple concepts to solve',
      },
    ],
  };

  return problems[difficulty] || problems.medium;
}

export default generateFollowUpProblems;