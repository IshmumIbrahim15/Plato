import { plannerAgent } from "./plannerAgent.js";
import { tutorAgent } from "./lessonAgent.js";
import { quizGenerator, quizEvaluator } from "./quizAgent.js";

export async function runLearningCycle(userModel, userAnswers = null) {

  // ----------------------------------------------------------
  // STEP 1 — First time planning (no test results yet)
  // ----------------------------------------------------------
  console.log("\n=== STEP 1: INITIAL PLANNING ===");

  let plan;
  try {
    plan = await plannerAgent(userModel, null); // <----- UPDATED
    console.log("Planner output:", plan);
  } catch (err) {
    console.error("Planner agent failed:", err);
    throw err;
  }

  // Extract subtopic from multiple possible planner outputs
  let nextSubtopic = extractNextSubtopic(plan);

  if (!nextSubtopic) {
    throw new Error("Planner did not return a usable next subtopic");
  }

  // ----------------------------------------------------------
  // STEP 2 — Tutor Agent creates lesson
  // ----------------------------------------------------------
  console.log("\n=== STEP 2: GENERATE LESSON ===");

  let lesson;
  try {
    lesson = await tutorAgent(nextSubtopic, userModel);
    console.log("Lesson Title:", lesson?.title);
  } catch (err) {
    console.error("Tutor agent failed:", err);
    throw err;
  }

  // ----------------------------------------------------------
  // STEP 3 — Generate Quiz
  // ----------------------------------------------------------
  console.log("\n=== STEP 3: GENERATE QUIZ ===");

  let quiz;
  try {
    quiz = await quizGenerator(lesson, userModel);
    console.log("Quiz Generated with", quiz?.questions?.length || 0, "questions");
  } catch (err) {
    console.error("Quiz generation failed:", err);
    throw err;
  }

  // If this is FIRST half of the cycle → return quiz to frontend  
  if (!userAnswers) {
    return {
      cycle: "quiz_ready",
      plan,
      nextSubtopic,
      lesson,
      quiz,
      userModel,
    };
  }

  // ----------------------------------------------------------
  // STEP 4 — Evaluate user performance
  // ----------------------------------------------------------
  console.log("\n=== STEP 4: EVALUATE QUIZ ===");

  let evalResult;
  try {
    evalResult = await quizEvaluator(quiz, userAnswers, userModel);
    console.log("User Score:", evalResult.score, "/", evalResult.total);
  } catch (err) {
    console.error("Quiz evaluation failed:", err);
    throw err;
  }

  // Update mastery
  userModel.mastery = evalResult.updatedMastery;
  console.log("\n=== UPDATED MASTERY ===");
  console.log(userModel.mastery);

  // ----------------------------------------------------------
  // STEP 5 — SECOND PLANNING PHASE (using quiz results)
  // ----------------------------------------------------------
  console.log("\n=== STEP 5: FOLLOW-UP PLANNING (AFTER TEST) ===");

  let followupPlan;
  try {
    followupPlan = await plannerAgent(userModel, evalResult);  // <---- UPDATED
    console.log("Follow-up planner output:", followupPlan);
  } catch (err) {
    console.error("Follow-up planner failed:", err);
    throw err;
  }

  let recommendedNext = extractNextSubtopic(followupPlan);

  return {
    cycle: "evaluation_complete",
    plan,
    previousLesson: lesson,
    quiz,
    evalResult,
    updatedModel: userModel,
    followupPlan,
    recommendedNext,
  };
}

// Helper to extract subtopic safely
function extractNextSubtopic(plan) {
  if (!plan) return null;

  if (typeof plan === "string") return plan;

  if (plan?.curriculum?.length) {
    return plan.curriculum[0].subtopic || plan.curriculum[0].title;
  }

  if (plan?.subtopicMap?.length) {
    return plan.subtopicMap[0].name || plan.subtopicMap[0].id;
  }

  if (plan?.subtopics?.length) {
    return plan.subtopics[0].name || plan.subtopics[0].id;
  }

  return null;
}

// Auto-run for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const userModel = {
    userId: "test-user",
    topic: "Calculus",
    level: "beginner",
    mastery: { chain_rule: 0.2, product_rule: 0.3 },
    history: {},
    curriculum: [],
  };

  runLearningCycle(userModel).then((out) => {
    console.log("\n=== PIPELINE OUTPUT ===\n");
    console.dir(out, { depth: null });
  });
}

const userModel = {
  userId: "test1",
  topic: "Calculus",
  level: "beginner",
  mastery: {},
  history: {},
  curriculum: []
};

runLearningCycle(userModel).then(console.log).catch(console.error);
