import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";
import { parseLLMJson } from './llmParser.js'

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Plato Dynamic Planner Agent",
  },
});

async function callLLM(model, system, user) {
  const result = await client.chat.send({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user }
    ]
  });
  return result.choices[0].message.content;
}

/*
==============================================================
   PLANNER AGENT — Dynamically generates subtopics
   based on user-selected SUBJECT/TOPIC
==============================================================
*/
export async function plannerAgent(userModel, finalTestResults) {

  if (!userModel.topic) {
    throw new Error("User must choose a topic before planning.");
  }

  // ---------------------------------------------------------------------
  // 0. Generate the full subtopic map for the chosen subject (NEW!)
  // ---------------------------------------------------------------------
  const mapSystem = `
    You are a subject-mapping AI.  
    Given any subject, create a comprehensive, hierarchical list of the
    MOST important subtopics a beginner/intermediate/advanced student
    must learn to master the subject.

    Requirements:
    - MUST output ONLY JSON.
    - Subtopics should be specific and useful for making lessons.
    - Include 8–15 subtopics max.
  `;

  const mapUser = `
    Subject chosen by user: ${userModel.topic}

    Student level: ${userModel.level}

    Return EXACT JSON:
    {
       "subtopics": [
          { "id": "s1", "name": "", "prerequisites": [] }
       ]
    }
  `;

  const mapRaw = await callLLM("openai/gpt-4.1-mini", mapSystem, mapUser);
  const subtopicMap = parseLLMJson(mapRaw);
  userModel.generatedSubtopics = subtopicMap.subtopics;


  // ---------------------------------------------------------------------
  // 1. Weakness Analysis Agent (uses REAL final test data)
  // ---------------------------------------------------------------------
  const weaknessSystem = `
    You are an educational analytics AI.
    Use ONLY final test performance + generated subtopics to determine
    which areas the user must focus on.

    Output ONLY JSON.
  `;

  const weaknessUser = `
    Generated Subtopics:
    ${JSON.stringify(subtopicMap.subtopics)}

    Final Test Results:
    ${JSON.stringify(finalTestResults)}

    Mastery (before test):
    ${JSON.stringify(userModel.mastery)}

    Return EXACT JSON:
    {
      "weakConcepts": [],
      "strongConcepts": [],
      "criticalFailures": [],
      "primaryFocus": ""
    }
  `;

  const weakRaw = await callLLM("openai/gpt-4.1-mini", weaknessSystem, weaknessUser);
  const weaknessAnalysis = parseLLMJson(weakRaw);


  // ---------------------------------------------------------------------
  // 2. Curriculum Designer Agent
  // ---------------------------------------------------------------------
  const designSystem = `
    You are a curriculum designer AI.
    Design lessons ONLY using the generated subtopics and weaknesses.

    Rules:
    - Address critical failures first.
    - Next, address remaining weak concepts.
    - Avoid strong concepts entirely.
    - Ensure the learning sequence builds from prerequisites.
    - Return ONLY JSON.
  `;

  const designUser = `
    Weakness Analysis:
    ${JSON.stringify(weaknessAnalysis)}

    All available subtopics for this subject:
    ${JSON.stringify(subtopicMap.subtopics)}

    Return EXACT JSON:
    {
      "curriculum": [
        {
          "lessonId": "",
          "title": "",
          "subtopic": "",
          "estimatedTime": 0,
          "skillsTargeted": []
        }
      ]
    }
  `;

  const designRaw = await callLLM("openai/gpt-4.1", designSystem, designUser);
  const curriculumDraft = parseLLMJson(designRaw);


  // ---------------------------------------------------------------------
  // 3. Curriculum Optimizer Agent
  // ---------------------------------------------------------------------
  const optimizeSystem = `
    You are a curriculum optimization AI.
    Improve the curriculum by applying:
    - Prerequisite ordering
    - Difficulty scaling
    - Avoiding overload
    - Eliminating redundant lessons

    Output ONLY JSON.
  `;

  const optimizeUser = `
    Draft Curriculum:
    ${JSON.stringify(curriculumDraft.curriculum)}

    Subtopics (for prerequisites):
    ${JSON.stringify(subtopicMap.subtopics)}

    Weakness Analysis:
    ${JSON.stringify(weaknessAnalysis)}

    Return:
    {
      "optimizedCurriculum": []
    }
  `;

  const optimizeRaw = await callLLM("anthropic/claude-3.5-sonnet", optimizeSystem, optimizeUser);
  const optimized = parseLLMJson(optimizeRaw);


  // ---------------------------------------------------------------------
  // 4. Curriculum Validator Agent
  // ---------------------------------------------------------------------
  const validateSystem = `
    You are a curriculum validation AI.
    Validate that:
    - All weak concepts are addressed
    - Critical failures are FIRST
    - Prerequisite order is correct
    - Curriculum is actionable and realistic
    - Subtopic names match the generated map

    Output ONLY JSON.
  `;

  const validateUser = `
    Optimized Curriculum:
    ${JSON.stringify(optimized.optimizedCurriculum)}

    Generated Subtopics:
    ${JSON.stringify(subtopicMap.subtopics)}

    Weakness Analysis:
    ${JSON.stringify(weaknessAnalysis)}

    Return EXACT JSON:
    {
      "finalCurriculum": [],
      "notes": ""
    }
  `;

  const validateRaw = await callLLM("openai/gpt-4.1-mini", validateSystem, validateUser);
  const validated = parseLLMJson(validateRaw);


  // ---------------------------------------------------------------------
  // FINAL OUTPUT
  // ---------------------------------------------------------------------
  return {
    subject: userModel.topic,
    subtopicMap: subtopicMap.subtopics,
    weaknessAnalysis,
    curriculum: validated.finalCurriculum,
    notes: validated.notes,
    usedFinalTest: true
  };
}


// Auto-run for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const userModel = {
    userId: "user1",
    topic: "Calculus",
    level: "beginner",
    mastery: {},
    history: {},
    curriculum: []
  };

  const finalTestResults = {
    score: 0.55,
    questions: [
      { concept: "derivatives", correct: false },
      { concept: "limits", correct: true },
      { concept: "integrals", correct: false }
    ]
  };

  plannerAgent(userModel, finalTestResults).then((result) => {
    console.log("\n===== DYNAMIC PLANNER OUTPUT =====\n");
    console.dir(result, { depth: null });
  });
}
