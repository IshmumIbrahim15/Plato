import { callOpenRouterLLM, LLM_MODELS } from '../config/openrouter.js';

/**
 * Make adaptive learning decision
 * Uses Claude for deep reasoning
 * Decides: DRILL, RETEACH, ADVANCE, or REINFORCE
 */
export async function makeAdaptiveDecision(errorAnalysis, mastery, score, prerequisites) {
  const decisionPrompt = `
Based on this analysis:
${errorAnalysis}

Student Metrics:
- Quiz Score: ${score}/100
- Mastery Level: ${(mastery * 100).toFixed(0)}%
- Prerequisites Available: ${prerequisites.length > 0 ? prerequisites.map((p) => p.name).join(', ') : 'None'}

DECIDE what the learning system should do:

1. DRILL - Generate more practice problems on the same topic
2. RETEACH - Go back to prerequisites first
3. ADVANCE - Move to next topic
4. REINFORCE - Consolidate current understanding

Respond with EXACTLY ONE of these: DRILL | RETEACH | ADVANCE | REINFORCE

Decision Logic:
- If mastery < 30% OR score < 40% AND gaps in prerequisites → RETEACH
- If mastery < 50% AND trending up → DRILL (student is improving)
- If 50% < mastery < 80% → REINFORCE or DRILL
- If mastery > 80% → ADVANCE
- If score high but low mastery → ADVANCE quickly

Respond with ONLY the decision word (no explanation).
  `;

  try {
    const decision = await callOpenRouterLLM(
      LLM_MODELS.TUTOR,
      'You are an educational decision engine. Make precise adaptive learning decisions.',
      decisionPrompt,
      0.2 // Very low temperature for deterministic decisions
    );

    const decisionType = decision.trim().toUpperCase();
    const validDecisions = ['DRILL', 'RETEACH', 'ADVANCE', 'REINFORCE'];

    if (!validDecisions.includes(decisionType)) {
      // Fallback decision logic
      return getFallbackDecision(mastery, score, prerequisites);
    }

    return {
      type: decisionType,
      feedback: getFeedbackForDecision(decisionType, mastery, score, prerequisites),
    };
  } catch (error) {
    console.error('Error making decision:', error);
    return getFallbackDecision(mastery, score, prerequisites);
  }
}

/**
 * Get feedback message for each decision type
 */
function getFeedbackForDecision(decision, mastery, score, prerequisites) {
  switch (decision) {
    case 'DRILL':
      return `Great effort! Your understanding is improving. Let's practice more problems to solidify these concepts. You're ${(mastery * 100).toFixed(0)}% of the way to mastery!`;

    case 'RETEACH':
      const prereqNames = prerequisites.length > 0 ? prerequisites[0].name : 'fundamentals';
      return `I noticed you might benefit from reviewing ${prereqNames} first. Let's strengthen those foundations before moving forward.`;

    case 'ADVANCE':
      return `Excellent! You've mastered this concept. You're ready to move to the next topic and expand your knowledge!`;

    case 'REINFORCE':
      return `You're on the right track! Let's review and solidify what you've learned to build a strong foundation for what comes next.`;

    default:
      return `Let's continue learning and improving!`;
  }
}

/**
 * Fallback decision if LLM fails
 */
function getFallbackDecision(mastery, score, prerequisites) {
  let type = 'REINFORCE';

  if (mastery < 0.3 && prerequisites.length > 0) {
    type = 'RETEACH';
  } else if (mastery < 0.5) {
    type = 'DRILL';
  } else if (mastery > 0.8) {
    type = 'ADVANCE';
  }

  return {
    type,
    feedback: getFeedbackForDecision(type, mastery, score, prerequisites),
  };
}

export default makeAdaptiveDecision;