import "dotenv/config";
import { OpenRouter } from "@openrouter/sdk";

const MODEL = "openai/gpt-4.1-mini"; // <- use any valid OpenRouter model ID

// 1) Create the OpenRouter client (this is the `client` you were missing)
const client = new OpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000", // or your frontend URL
    "X-Title": "Plato Test",
  },
});

// 2) Generic helper that talks to the model
async function callLLM(system, user) {
  const completion = await client.chat.send({
    model: MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });

  return completion.choices[0].message.content;
}


//AI Models
async function plannerAgent(userModel) {
  const system = `
    You are a curriculum planner. Reply with ONLY the next subtopic name.
  `;
  const user = `
    Topic: ${userModel.topic}
    Level: ${userModel.level}
    Mastery: ${JSON.stringify(userModel.mastery)}
  `;

  const subtopic = (await callLLM(system, user)).trim();
  return subtopic;
}

async function tutorAgent(subtopic, level) {
  const system = `
    You are a teaching agent. Return ONLY JSON, no extra text.
  `;
  const user = `
    Create a short lesson for a ${level} learner on "${subtopic}".

    Return JSON like:
    {
      "title": "...",
      "objectives": ["...", "..."],
      "content": "full lesson text"
    }
  `;

  const raw = await callLLM(system, user);
  const json = JSON.parse(extractJson(raw));
  return json; // { title, objectives, content }
}

async function quizAgent(lessonJson) {
  const system = `
    You are a quiz generator. Return ONLY JSON, no extra text.
  `;
  const user = `
    Based on this lesson, create 3 multiple-choice questions.

    Lesson: ${JSON.stringify(lessonJson)}

    Return JSON like:
    {
      "questions": [
        {
          "id": "q1",
          "concept": "tag",
          "question": "text",
          "options": ["A","B","C","D"],
          "correctOptionIndex": 0
        }
      ]
    }
  `;

  const raw = await callLLM(system, user);
  const json = JSON.parse(extractJson(raw));
  return json;
}

// helper to pull JSON out even if the model wraps it
function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) {
    throw new Error("No JSON found in model response:\n" + text);
  }
  return text.slice(start, end + 1);
}

// ------------------ TEST CASE PIPELINE ------------------

async function runTestCase() {
  const userModel = {
    userId: "test-user-1",
    topic: "fractions",
    level: "beginner",
    mastery: {},
  };

  console.log("Running test case with model:", MODEL);

  const subtopic = await plannerAgent(userModel);
  console.log("\n[Planner] Next subtopic:", subtopic);

  const lesson = await tutorAgent(subtopic, userModel.level);
  console.log("\n[Tutor] Lesson title:", lesson.title);

  const quiz = await quizAgent(lesson);
  console.log("\n[Quiz] Number of questions:", quiz.questions.length);

  console.log("\n--- FULL OUTPUT ---");
  console.dir({ userModel, subtopic, lesson, quiz }, { depth: null });
}

runTestCase()