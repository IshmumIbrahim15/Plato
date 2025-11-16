import axios from 'axios';

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// LLM models for different purposes
// OPTIMIZED FOR $30 OPENROUTER CREDIT 
export const LLM_MODELS = {
  ANALYZER: 'google/gemini-2.0-flash-exp',      // Cheapest + fastest (cost: ~$5/1M tokens)
  QUIZ_GENERATOR: 'openai/gpt-4o-mini',         // Budget GPT-4 option (cost: ~$0.15/1M tokens)
  TUTOR: 'anthropic/claude-3.5-sonnet',         // Cheapest Claude (cost: ~$3/1M tokens)
  MOTIVATOR: 'anthropic/claude-3.5-sonnet',
};

// COST ESTIMATE:
// Per quiz: ~$0.005
// Budget: $30
// Possible quizzes: 6,000+


/**
 * Call OpenRouter API with a specific model
 * @param {string} model - Model to use (from LLM_MODELS)
 * @param {string} systemPrompt - System prompt for the model
 * @param {string} userMessage - User message
 * @param {number} temperature - Temperature (0-1)
 * @returns {Promise<string>} - Model response text
 */
export async function callOpenRouterLLM(
  model,
  systemPrompt,
  userMessage,
  temperature = 0.7
) {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY not configured in .env');
  }

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
        max_tokens: 1500,
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
    throw new Error(`OpenRouter API failed: ${error.message}`);
  }
}

export { OPENROUTER_API_KEY, OPENROUTER_BASE_URL };