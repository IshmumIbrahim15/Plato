import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";
import { parseLLMJson } from './llmParser.js'
import "dotenv/config";

// Use the same OpenRouter client as plannerAgent
const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Plato Tutor Agent",
  },
});

async function callLLM(model, system, user) {
  const completion = await client.chat.send({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });

  return completion.choices[0].message.content;
}

// The extractJson function has been removed in favor of parseLLMJson.

// ------------------------------------------------------------
// TUTOR AGENT — Generates Lessons for Each Subtopic
// ------------------------------------------------------------
export async function tutorAgent(subtopic, userModel) {
  const system = `
    You are an Education-Focused Lesson Generation AI.
    You MUST return structured JSON only.

    Your responsibilities:
    - Write a clear, structured lesson for the given subtopic.
    - Adapt content to the student's level: beginner, intermediate, advanced.
    - Include:
      * Title
      * Learning objectives
      * Explanation
      * Step-by-step examples
      * One mini-check (small question)
      * 2–3 practice problems (no solutions)
      * Optional visual explanation (ASCII if needed)
    
    Do NOT include extra commentary.
  `;

  const user = `
    Subtopic to teach: "${subtopic}"
    Student Level: ${userModel.level}
    Mastery Scores: ${JSON.stringify(userModel.mastery)}

    Return JSON in EXACT format:

    {
      "lessonId": "",
      "title": "",
      "subtopic": "",
      "level": "",
      "objectives": [""],
      "explanation": "",
      "examples": [
        {
          "header": "",
          "steps": [""]
        }
      ],
      "miniCheck": "",
      "practiceProblems": [""],
      "asciiVisual": ""
    }
  `;

  const raw = await callLLM("openai/gpt-4.1", system, user);
  return parseLLMJson(raw);
}

// ------------------------------------------------------------
// Auto-run for testing
// ------------------------------------------------------------

if (import.meta.url === `file://${process.argv[1]}`) {
  const testUser = {
    userId: "1",
    level: "beginner",
    mastery: {
      numerators: 0.4,
      derivatives_rules: 0.2
    }
  };

  tutorAgent("Chain Rule", testUser)
    .then((lesson) => {
      console.log("\n========== GENERATED LESSON ==========\n");
      console.dir(lesson, { depth: null });
    })
    .catch(console.error);
}
