const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .describe(
      "A score between 0 and 100 indicating how well the candidate's profile matches the job description",
    ),
  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The actual technical interview question"),
        intention: z
          .string()
          .describe("Why the interviewer is asking this question"),
        answer: z
          .string()
          .describe("How the candidate should answer this question"),
      }),
    )
    .describe("List of technical questions. Generate at least 5."),
  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The actual behavioral interview question"),
        intention: z
          .string()
          .describe("Why the interviewer is asking this question"),
        answer: z
          .string()
          .describe("How the candidate should answer this question"),
      }),
    )
    .describe("List of behavioral questions. Generate at least 5."),
  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill the candidate is lacking"),
        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "Severity: Use 'high' for critical missing core skills, 'medium' for skills that need improvement, and 'low' for nice-to-have or bonus skills.",
          ),
      }),
    )
    .describe(
      "List of skill gaps. Accurately assign 'low', 'medium', or 'high' severities. Do NOT make everything 'high' unless it is a 0% match.",
    ),
  preparationPlan: z
    .array(
      z.object({
        day: z.number().describe("The day number (1 to 7)"),
        focus: z.string().describe("The main study focus for this day"),
        tasks: z
          .array(z.string())
          .describe("Specific tasks to complete on this day"),
      }),
    )
    .describe(
      "Day-by-day preparation plan. Generate EXACTLY 7 days. If there is a mismatch, make it a beginner transition plan.",
    ),
  title: z
    .string()
    .describe(
      "A dynamic, specific title for this report based on the Job Description. Example: 'Senior React Developer Prep' or 'HR Manager Interview'. DO NOT use generic titles like 'Interview Preparation Report'.",
    ),
});

// Data Healer for Questions
function normalizeQuestions(questionsArray) {
  if (!questionsArray || !Array.isArray(questionsArray)) return [];

  const healedQuestions = [];
  let pendingQuestion = null;

  for (let item of questionsArray) {
    if (typeof item === "object" && item !== null && item.question) {
      if (pendingQuestion) {
        healedQuestions.push(pendingQuestion);
        pendingQuestion = null;
      }
      healedQuestions.push({
        question: item.question || "Question not generated",
        intention:
          item.intention ||
          "To assess general knowledge based on the job description.",
        answer:
          item.answer ||
          "Provide a confident and context-aware response based on your experience.",
      });
      continue;
    }

    if (typeof item === "string" && item.trim().startsWith("{")) {
      try {
        if (pendingQuestion) {
          healedQuestions.push(pendingQuestion);
          pendingQuestion = null;
        }
        const parsedItem = JSON.parse(item);
        healedQuestions.push({
          question: parsedItem.question || "Question not generated",
          intention: parsedItem.intention || "To assess general knowledge.",
          answer: parsedItem.answer || "Provide a context-aware response.",
        });
        continue;
      } catch (e) {}
    }

    if (typeof item === "string" && item.trim().length > 3) {
      // 🚀 NEW FIX: Check if the AI "Mashed" everything into one single string
      const hasIntentionKeyword = /intention:/i.test(item);
      const hasAnswerKeyword = /answer:/i.test(item);

      // If it has all parts mashed together in one string...
      if (
        hasIntentionKeyword &&
        hasAnswerKeyword &&
        !item.toLowerCase().trim().startsWith("intention")
      ) {
        // Chop the string into 3 pieces using Regex
        const parts = item.split(/intention:/i);
        const qPart = parts[0]
          .replace(/^question:?\s*(\d+\.?\s*)?/i, "")
          .trim();

        let iPart = "No intention provided...";
        let aPart = "No model answer available...";

        if (parts.length > 1) {
          const subParts = parts[1].split(/answer:/i);
          iPart = subParts[0].trim(); // Intention part
          if (subParts.length > 1) {
            aPart = subParts[1].trim(); // Answer part
          }
        }

        if (pendingQuestion) {
          healedQuestions.push(pendingQuestion);
          pendingQuestion = null;
        }

        // Push the chopped pieces into their perfect boxes
        healedQuestions.push({
          question: qPart,
          intention: iPart,
          answer: aPart,
        });
        continue; // Skip to the next item
      }

      // Existing logic for "Flat Spread" arrays
      const lowerItem = item.toLowerCase().trim();

      if (
        lowerItem.startsWith("intention") ||
        lowerItem.startsWith("intent:")
      ) {
        if (pendingQuestion)
          pendingQuestion.intention = item.replace(/^intention:?\s*/i, "");
        else if (healedQuestions.length > 0)
          healedQuestions[healedQuestions.length - 1].intention = item.replace(
            /^intention:?\s*/i,
            "",
          );
        continue;
      }

      if (
        lowerItem.startsWith("answer") ||
        lowerItem.startsWith("model answer:")
      ) {
        if (pendingQuestion) {
          pendingQuestion.answer = item.replace(/^answer:?\s*/i, "");
          healedQuestions.push(pendingQuestion);
          pendingQuestion = null;
        } else if (healedQuestions.length > 0) {
          healedQuestions[healedQuestions.length - 1].answer = item.replace(
            /^answer:?\s*/i,
            "",
          );
        }
        continue;
      }

      if (pendingQuestion) healedQuestions.push(pendingQuestion);
      pendingQuestion = {
        question: item.replace(/^question:?\s*(\d+\.?\s*)?/i, ""),
        intention:
          "No intention provided by AI. Treat this as a direct technical/behavioral check.",
        answer:
          "No model answer available. Answer based on your raw skills and project experience.",
      };
    }
  }
  if (pendingQuestion) healedQuestions.push(pendingQuestion);
  return healedQuestions;
}

// Data Healer for Skill Gaps (Smart Regex Version)
function normalizeSkillGaps(gapsArray) {
  if (!gapsArray || !Array.isArray(gapsArray)) return [];

  return gapsArray
    .map((item) => {
      // Helper function to extract severity from text
      const extractSeverity = (text, defaultSev) => {
        const match = text.match(/\((low|medium|high)\)/i);
        return match ? match[1].toLowerCase() : defaultSev;
      };

      // Helper function to clean the skill name
      const cleanSkillName = (text) => {
        return text.replace(/\s*\((low|medium|high)\)/i, "").trim();
      };

      // Case 1: AI sends an object
      if (typeof item === "object" && item !== null && item.skill) {
        const validSeverities = ["low", "medium", "high"];
        let parsedSeverity = item.severity ? item.severity.toLowerCase() : "";

        // If severity is missing or invalid, try to extract it from the skill string
        if (!validSeverities.includes(parsedSeverity)) {
          parsedSeverity = extractSeverity(item.skill, "medium");
        }

        return {
          skill: cleanSkillName(item.skill),
          severity: validSeverities.includes(parsedSeverity)
            ? parsedSeverity
            : "medium",
        };
      }

      // Case 2: AI is lazy and sends a plain string like "Python (High)"
      if (typeof item === "string") {
        return {
          skill: cleanSkillName(item),
          severity: extractSeverity(item, "medium"),
        };
      }

      return null;
    })
    .filter(Boolean);
}

// Data Healer for Preparation Plan
function normalizePreparationPlan(planArray) {
  if (!planArray || !Array.isArray(planArray)) return [];
  return planArray
    .map((item, index) => {
      if (
        typeof item === "object" &&
        item !== null &&
        (item.focus || item.tasks)
      ) {
        return {
          day: item.day || index + 1,
          focus: item.focus || "General Preparation",
          tasks: Array.isArray(item.tasks)
            ? item.tasks
            : [item.tasks || "Review materials"],
        };
      }
      if (typeof item === "string") {
        // Extract day number if it exists
        const dayMatch = item.match(/Day\s+(\d+)/i);
        const day = dayMatch ? parseInt(dayMatch[1], 10) : index + 1;
        return {
          day: day,
          focus: "Study Goal",
          tasks: [item.replace(/^Day\s+\d+:\s*/i, "")], // Remove "Day X:" from task
        };
      }
      return null;
    })
    .filter(Boolean);
}

async function generateWithFallback(prompt, schema) {
  const modelsToTry = [
    "gemini-3-flash-preview",
    "gemini-3.1-flash-lite",
    "gemini-3-pro",
  ];
  let lastError;

  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Requesting Gemini API using model: ${modelName}...`);

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: zodToJsonSchema(schema),
          temperature: 0,
        },
      });

      console.log(`✅ Success using ${modelName}`);
      return response;
    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Model ${modelName} failed. Reason: ${error.message}`);

      if (
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED") ||
        error.message.includes("404") ||
        error.message.includes("NOT_FOUND")
      ) {
        console.log(
          `🔄 Rate limit or model not found! Switching to fallback...`,
        );
        continue;
      } else {
        throw error;
      }
    }
  }

  throw new Error(`All models failed. Last error: ${lastError.message}`);
}

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `Generate a comprehensive interview preparation report for a candidate based on the following details.

Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription || "Not provided"}

CRITICAL INSTRUCTIONS:
1. Analyze the candidate's fit for the job. IF THERE IS A COMPLETE MISMATCH (e.g., Software Engineer applying for HR): You MUST still generate a complete 7-day preparationPlan focusing on foundational basics for the new role, and you MUST list the core JD skills as 'high' severity skillGaps. NEVER return empty arrays for gaps or roadmaps.
2. Generate exactly 5 technical questions and 5 behavioral questions tailored to this specific job description.
3. ABSOLUTE RULE FOR QUESTIONS: You are strictly forbidden from outputting just the questions. For EVERY single question, you MUST provide the 'question', the 'intention' (why the interviewer is asking), and the 'answer' (how the candidate should respond).
4. Create a 7-day preparation plan.
5. Keep all text concise and straight to the point (maximum 2-3 sentences per section).
6. DO NOT include markdown blocks (\`\`\`json). Output raw, valid JSON data only.
7. You MUST include a numerical 'matchScore' (0 to 100) representing the alignment between the candidate and the job. Do not skip this field.
8. Generate a catchy, job-specific 'title' for this report.

EXAMPLE OUTPUT FORMAT FOR QUESTIONS (YOU MUST FOLLOW THIS STRUCTURE):
"technicalQuestions": [
  {
    "question": "How do you ensure your React components remain responsive across different screen sizes?",
    "intention": "To evaluate the candidate's understanding of CSS, media queries, and responsive design principles within a component-based architecture.",
    "answer": "Mention the use of CSS modules or styled-components with media queries, fluid typography, and flexbox/grid layouts."
  }
]
`;

  try {
    const response = await generateWithFallback(prompt, interviewReportSchema);

    const responseText =
      typeof response.text === "function" ? response.text() : response.text;
    const parsedResponse = JSON.parse(responseText);

    // Helper to safely extract a number even if AI sends "85%" or "85"
    let finalMatchScore = 50; // Default
    if (
      parsedResponse.matchScore !== undefined &&
      parsedResponse.matchScore !== null
    ) {
      if (typeof parsedResponse.matchScore === "number") {
        finalMatchScore = parsedResponse.matchScore;
      } else if (typeof parsedResponse.matchScore === "string") {
        // Regex to extract only digits from strings like "85%"
        const extracted = parsedResponse.matchScore.match(/\d+/);
        if (extracted) {
          finalMatchScore = parseInt(extracted[0], 10);
        }
      }
    }

    const sanitizedResponse = {
      matchScore: finalMatchScore, // 🚀 Fixed Match Score logic
      technicalQuestions: normalizeQuestions(parsedResponse.technicalQuestions),
      behavioralQuestions: normalizeQuestions(
        parsedResponse.behavioralQuestions,
      ),
      skillGaps: normalizeSkillGaps(parsedResponse.skillGaps),
      preparationPlan: normalizePreparationPlan(parsedResponse.preparationPlan),
      title: parsedResponse.title || "Interview Preparation Report",
    };

    if (
      !sanitizedResponse.technicalQuestions.length ||
      !sanitizedResponse.behavioralQuestions.length ||
      !sanitizedResponse.preparationPlan.length
    ) {
      console.warn(
        "⚠️ Gemini response missing expected arrays; check raw response text:",
        responseText,
      );
    }

    return sanitizedResponse;
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    throw new Error(`Failed to generate interview report: ${error.message}`);
  }
}

module.exports = { generateInterviewReport };
