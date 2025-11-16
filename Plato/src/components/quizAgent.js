import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";

const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "Plato Quiz & Evaluation Agent",
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

function extractJson(text) {
  const s = text.indexOf("{");
  const e = text.lastIndexOf("}");
  if (s === -1 || e === -1) throw new Error("JSON not found in LLM output");
  return JSON.parse(text.slice(s, e + 1));
}

// ------------------------------------------------------------
// QUIZ GENERATION
// ------------------------------------------------------------

export async function quizGenerator(lesson, userModel) {
  const system = `
    You are a Quiz Generation AI for a learning platform.
    Your job is to create a quiz that evaluates understanding of the provided lesson.

    Requirements:
    - 5 multiple-choice questions.
    - Each question MUST include a "concept" tag.
    - Questions must reflect the lesson content exactly.
    - Return ONLY JSON.
  `;

  const user = `
    Student Level: ${userModel.level}

    Lesson data:
    ${JSON.stringify(lesson)}

    Return JSON EXACTLY in this format:

    {
      "quizId": "",
      "questions": [
        {
          "id": "",
          "concept": "",
          "question": "",
          "options": ["", "", "", ""],
          "correctOptionIndex": 0
        }
      ]
    }
  `;

  const raw = await callLLM("openai/gpt-4.1-mini", system, user);
  return extractJson(raw);
}

// ------------------------------------------------------------
// QUIZ EVALUATION
// ------------------------------------------------------------

export async function quizEvaluator(quizJson, userAnswers, userModel) {
  const system = `
    You are a grading and learning analytics AI.
    
    Your responsibilities:
    - Grade user's answers.
    - Identify concepts the user is weak in.
    - Update mastery scores on a 0–1 scale.
    - Recommend EXACT concepts to reteach.
    - Output ONLY JSON.
  `;

  const user = `
    Quiz:
    ${JSON.stringify(quizJson)}

    User Answers (index represents question order):
    ${JSON.stringify(userAnswers)}

    Existing mastery:
    ${JSON.stringify(userModel.mastery)}

    Return JSON EXACTLY:

    {
      "score": 0,
      "total": 0,
      "incorrectConcepts": ["", ""],
      "updatedMastery": {},
      "recommendations": ["", ""]
    }
  `;

  const raw = await callLLM("openai/gpt-4.1-mini", system, user);
  return extractJson(raw);
}

// ------------------------------------------------------------
// QUIZ AGENT (COMBINED GENERATOR + EVALUATION)
// ------------------------------------------------------------

export async function quizAgent(lesson, userAnswers, userModel) {
  // If no answers yet → generate quiz
  if (!userAnswers) {
    const quiz = await quizGenerator(lesson, userModel);
    return {
      mode: "generate",
      quiz,
    };
  }

  // User completed quiz → evaluate performance
  const evaluation = await quizEvaluator(lesson.quiz, userAnswers, userModel);

  // Return combined output
  return {
    mode: "evaluate",
    evaluation,
  };
}

// ------------------------------------------------------------
// TEST RUN (this allows running `node quizAgent.js`)
// ------------------------------------------------------------
if (import.meta.url === `file://${process.argv[1]}`) {
  const exampleLesson = {
    lessonId: "lesson-1",
    title: "Chain Rule Basics",
    subtopic: "chain_rule",
    level: "beginner",
    objectives: ["Apply chain rule"],
    explanation: "The chain rule is used when ...",
    examples: [
      {
        header: "Example 1",
        steps: ["outer function", "inner function", "multiply derivatives"]
      }
    ],
    practiceProblems: ["Differentiate (3x+1)^5"]
  };

  const userModel = {
    level: "beginner",
    mastery: {
      chain_rule: 0.2,
      derivatives_rules: 0.5
    }
  };

  // Simulate generating a quiz
  quizGenerator(exampleLesson, userModel).then((quiz) => {
    console.log("\n===== GENERATED QUIZ =====\n");
    console.dir(quiz, { depth: null });

    // Now simulate user taking quiz
    const userAnswers = [1, 3, 0, 0, 2]; // random placeholder answers

    quizEvaluator(quiz, userAnswers, userModel).then((evalResult) => {
      console.log("\n===== EVALUATION RESULT =====\n");
      console.dir(evalResult, { depth: null });
    });
  });
}