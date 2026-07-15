const { GoogleGenAI } = require("@google/genai");
const logger = require("../utils/logger");

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

// ── Explicit JSON schema (no zodToJsonSchema — Gemini needs a clean schema) ──
const INTERVIEW_REPORT_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    matchScore: { type: "number" },
    technicalQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question:  { type: "string" },
          intention: { type: "string" },
          answer:    { type: "string" },
        },
        required: ["question", "intention", "answer"],
      },
    },
    behavioralQuestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question:  { type: "string" },
          intention: { type: "string" },
          answer:    { type: "string" },
        },
        required: ["question", "intention", "answer"],
      },
    },
    skillGaps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          skill:    { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["skill", "severity"],
      },
    },
    preparationPlan: {
      type: "array",
      items: {
        type: "object",
        properties: {
          day:   { type: "number" },
          focus: { type: "string" },
          tasks: { type: "array", items: { type: "string" } },
        },
        required: ["day", "focus", "tasks"],
      },
    },
  },
  required: [
    "title",
    "matchScore",
    "technicalQuestions",
    "behavioralQuestions",
    "skillGaps",
    "preparationPlan",
  ],
};

// ── Normalizers ───────────────────────────────────────────────────────────────

/**
 * Normalize a single question item into { question, intention, answer }.
 * Handles objects, JSON strings, and flat strings with _text:/_intention:/_answer: prefixes.
 */
function normalizeQuestionItem(item, index) {
  // Already a proper object
  if (item && typeof item === "object" && !Array.isArray(item)) {
    // Handle _text / _intention / _answer variant Gemini sometimes produces
    const question =
      (item.question || item._text || item.text || item.prompt || "").trim();
    const intention =
      (item.intention || item._intention || item.intent || item.purpose || "").trim();
    const answer =
      (item.answer || item._answer || item.answerText || item.response || "").trim();

    return {
      question:  question  || `Question ${index + 1}`,
      intention: intention || "To assess knowledge and suitability for the role.",
      answer:    answer    || "Provide a confident, experience-based response.",
    };
  }

  // JSON string
  if (typeof item === "string" && item.trim().startsWith("{")) {
    try {
      return normalizeQuestionItem(JSON.parse(item.trim()), index);
    } catch (_) {}
  }

  // Flat string — may carry a prefix like "_text: ...", "question: ...", etc.
  if (typeof item === "string" && item.trim().length > 3) {
    const s = item.trim();

    // Mashed single-string: "Q1 text intention: ... answer: ..."
    const hasIntention = /_?intention:/i.test(s);
    const hasAnswer    = /_?answer:/i.test(s);

    if (hasIntention && hasAnswer && !s.toLowerCase().startsWith("intention")) {
      const iParts = s.split(/_?intention:/i);
      const qText  = iParts[0].replace(/^_?(?:question|text):?\s*(\d+\.?\s*)?/i, "").trim();
      const rest   = iParts[1] || "";
      const aParts = rest.split(/_?answer:/i);
      return {
        question:  qText || `Question ${index + 1}`,
        intention: aParts[0].trim() || "To assess knowledge for the role.",
        answer:    (aParts[1] || "").trim() || "Provide a context-aware response.",
      };
    }

    // Bare string — treat as question text only
    const cleanText = s.replace(/^_?(?:question|text|q\d+):?\s*(\d+\.?\s*)?/i, "").trim();
    return {
      question:  cleanText || `Question ${index + 1}`,
      intention: "To assess knowledge and suitability for the role.",
      answer:    "Provide a confident, experience-based response.",
    };
  }

  return null;
}

/**
 * Group a flat array of strings (where every 3 items = question/intention/answer)
 * or a proper array of objects into question cards.
 */
function normalizeQuestions(rawArray) {
  if (!Array.isArray(rawArray) || rawArray.length === 0) return [];

  // If every item is already a proper object with a question field → fast path
  const allObjects = rawArray.every(
    (i) => i && typeof i === "object" && (i.question || i._text || i.text),
  );
  if (allObjects) {
    return rawArray
      .map((item, idx) => normalizeQuestionItem(item, idx))
      .filter(Boolean);
  }

  // Flat string array — collect into pending groups
  const result = [];
  let pending = null;

  for (const item of rawArray) {
    if (typeof item !== "string") {
      const obj = normalizeQuestionItem(item, result.length);
      if (obj) {
        if (pending) { result.push(pending); pending = null; }
        result.push(obj);
      }
      continue;
    }

    const s = item.trim();
    const lower = s.toLowerCase();

    // Intention line
    if (/^_?intention:?/i.test(lower)) {
      const val = s.replace(/^_?intention:?\s*/i, "").trim();
      if (pending) pending.intention = val;
      else if (result.length) result[result.length - 1].intention = val;
      continue;
    }

    // Answer line
    if (/^_?answer:?/i.test(lower) || /^model answer:?/i.test(lower)) {
      const val = s.replace(/^_?(?:model )?answer:?\s*/i, "").trim();
      if (pending) {
        pending.answer = val;
        result.push(pending);
        pending = null;
      } else if (result.length) {
        result[result.length - 1].answer = val;
      }
      continue;
    }

    // Question line (or bare text)
    if (pending) result.push(pending);
    pending = {
      question:  s.replace(/^_?(?:question|text|q\d+):?\s*(\d+\.?\s*)?/i, "").trim(),
      intention: "To assess knowledge and suitability for the role.",
      answer:    "Provide a confident, experience-based response.",
    };
  }

  if (pending) result.push(pending);
  return result.filter((q) => q && q.question);
}

/**
 * Normalise skill gaps. Handles objects, plain strings, and strings with
 * extra context text like "Teaching/Training Methodology: Medium. While Yashika..."
 */
function normalizeSkillGaps(rawArray) {
  if (!Array.isArray(rawArray)) return [];
  const VALID = ["low", "medium", "high"];

  return rawArray
    .map((item) => {
      let skill = "";
      let severity = "medium";

      if (item && typeof item === "object") {
        skill    = (item.skill || item.name || item.topic || "").trim();
        severity = (item.severity || item.level || "medium").toLowerCase().trim();
      } else if (typeof item === "string") {
        // Extract severity from parentheses like "Python (High)"
        const parenMatch = item.match(/\((low|medium|high)\)/i);
        if (parenMatch) {
          severity = parenMatch[1].toLowerCase();
          skill    = item.replace(/\s*\(.*?\)/g, "").trim();
        } else {
          skill = item.trim();
        }
      }

      // Skill names should be short — if the AI stuffed a full sentence in, take only what's before the first ":" or "." or keep first 60 chars
      if (skill.length > 60 || /[.:]/.test(skill)) {
        skill = skill.split(/[.:]/)[0].trim();
      }

      if (!VALID.includes(severity)) severity = "medium";
      if (!skill) return null;

      return { skill, severity };
    })
    .filter(Boolean);
}

/**
 * Normalise preparation plan. Handles objects and flat strings with
 * "day1_focus:", "day1_activities:", "Day 1:", etc.
 */
function normalizePreparationPlan(rawArray) {
  if (!Array.isArray(rawArray) || rawArray.length === 0) return [];

  // All proper objects
  if (rawArray.every((i) => i && typeof i === "object" && i.focus)) {
    return rawArray.map((item, idx) => ({
      day:   typeof item.day === "number" ? item.day : idx + 1,
      focus: (item.focus || "General Preparation").trim(),
      tasks: Array.isArray(item.tasks)
        ? item.tasks.map((t) => String(t).trim()).filter(Boolean)
        : [],
    }));
  }

  // Flat string array — re-group by day
  const dayMap = new Map(); // dayNumber → { focus, tasks[] }

  for (const item of rawArray) {
    if (item && typeof item === "object") {
      const d = item.day ?? 0;
      const entry = dayMap.get(d) || { focus: "", tasks: [] };
      if (item.focus) entry.focus = item.focus.trim();
      if (Array.isArray(item.tasks)) entry.tasks.push(...item.tasks.map(String));
      dayMap.set(d, entry);
      continue;
    }

    if (typeof item !== "string") continue;
    const s = item.trim();

    // "day1_focus: ..." or "day_1_focus: ..."
    const focusMatch = s.match(/^day_?(\d+)_focus:?\s*(.*)/i);
    if (focusMatch) {
      const d = parseInt(focusMatch[1], 10);
      const entry = dayMap.get(d) || { focus: "", tasks: [] };
      entry.focus = focusMatch[2].trim();
      dayMap.set(d, entry);
      continue;
    }

    // "day1_activities: ..." or "day1_tasks: ..."
    const actMatch = s.match(/^day_?(\d+)_(?:activities|tasks):?\s*(.*)/i);
    if (actMatch) {
      const d = parseInt(actMatch[1], 10);
      const entry = dayMap.get(d) || { focus: "", tasks: [] };
      // Split multiple activities separated by ". " or "; "
      const acts = actMatch[2].split(/[.;]\s+/).map((a) => a.trim()).filter(Boolean);
      entry.tasks.push(...acts);
      dayMap.set(d, entry);
      continue;
    }

    // "Day 1: ..." or "Day1: ..."
    const dayLineMatch = s.match(/^Day\s*(\d+):?\s*(.*)/i);
    if (dayLineMatch) {
      const d = parseInt(dayLineMatch[1], 10);
      const entry = dayMap.get(d) || { focus: "", tasks: [] };
      if (!entry.focus) entry.focus = dayLineMatch[2].trim() || "Study Goal";
      dayMap.set(d, entry);
      continue;
    }

    // Bare task string — append to the last day
    if (dayMap.size > 0) {
      const lastKey = [...dayMap.keys()].at(-1);
      dayMap.get(lastKey).tasks.push(s);
    }
  }

  // Convert map to sorted array
  if (dayMap.size > 0) {
    return [...dayMap.entries()]
      .sort(([a], [b]) => a - b)
      .map(([day, { focus, tasks }], idx) => ({
        day:   day || idx + 1,
        focus: focus || "General Preparation",
        tasks,
      }));
  }

  // Last resort — treat each item as a plain task string
  return rawArray
    .filter((i) => typeof i === "string" && i.trim())
    .map((item, idx) => ({
      day:   idx + 1,
      focus: "Study Goal",
      tasks: [item.replace(/^Day\s*\d+:\s*/i, "").trim()],
    }));
}

// ── Model fallback with timeout ───────────────────────────────────────────────

async function generateWithFallback(prompt, schema) {
  const modelsToTry = [
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-2.5-flash",
  ];
  let lastError;

  const withTimeout = (promise, ms) =>
    Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Gemini request timed out")), ms),
      ),
    ]);

  for (const modelName of modelsToTry) {
    try {
      logger.info(`🤖 Trying model: ${modelName}`);

      const response = await withTimeout(
        ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: schema,
            temperature: 0,
          },
        }),
        30000,
      );

      logger.info(`✅ Success with model: ${modelName}`);
      return response;
    } catch (error) {
      lastError = error;
      logger.warn(`⚠️ ${modelName} failed: ${error.message}`);

      const retryable =
        error.message.includes("429") ||
        error.message.includes("RESOURCE_EXHAUSTED") ||
        error.message.includes("404") ||
        error.message.includes("NOT_FOUND") ||
        error.message.includes("503") ||
        error.message.includes("UNAVAILABLE") ||
        error.message.includes("fetch failed") ||
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ETIMEDOUT") ||
        error.message.includes("EHOSTUNREACH") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("timeout") ||
        error.message.includes("network") ||
        error.message.includes("connection");

      if (retryable) {
        logger.info(`🔄 Switching to next model...`);
        continue;
      }
      throw error;
    }
  }

  throw new Error(`All models failed. Last error: ${lastError.message}`);
}

// ── Main export ───────────────────────────────────────────────────────────────

async function generateInterviewReport({ resume, selfDescription, jobDescription }) {
  const prompt = `You are an expert career coach. Generate a structured interview preparation report in valid JSON matching the provided schema exactly.

CANDIDATE PROFILE
=================
Resume:
${resume || "Not provided"}

Self Description:
${selfDescription || "Not provided"}

Target Job Description:
${jobDescription || "Not provided"}

STRICT OUTPUT RULES
===================
1. Return ONLY valid JSON. No markdown, no code blocks, no extra text.
2. Every technicalQuestions and behavioralQuestions item MUST be an object with exactly three string fields: "question", "intention", "answer".
   - "question"  → the interview question text only
   - "intention" → why the interviewer asks this (1-2 sentences)
   - "answer"    → how the candidate should answer (2-3 sentences)
3. Generate EXACTLY 5 technical questions and EXACTLY 5 behavioral questions.
4. Every skillGaps item MUST be an object with "skill" (short name, max 5 words) and "severity" ("low", "medium", or "high").
5. Every preparationPlan item MUST be an object with "day" (integer 1-7), "focus" (string), and "tasks" (array of strings).
6. Generate EXACTLY 7 preparation plan days.
7. matchScore must be a number 0-100.
8. title must be a short, job-specific string (e.g. "React Developer Interview Prep").
9. Keep all text concise — max 2-3 sentences per field.
10. DO NOT prefix field values with field names like "_text:", "_intention:", "_answer:".`;

  try {
    const response = await generateWithFallback(prompt, INTERVIEW_REPORT_SCHEMA);

    // Extract raw text from the SDK response
    let rawText = "";
    if (typeof response.text === "function") {
      rawText = response.text();
    } else if (typeof response.text === "string") {
      rawText = response.text;
    }

    if (!rawText && Array.isArray(response?.candidates) && response.candidates.length > 0) {
      const parts = response.candidates[0]?.content?.parts;
      if (Array.isArray(parts)) {
        rawText = parts
          .filter((p) => typeof p?.text === "string")
          .map((p) => p.text)
          .join("");
      }
    }

    rawText = rawText.trim();

    if (!rawText) {
      throw new Error("Gemini returned an empty response. Please try again.");
    }

    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch (jsonErr) {
      logger.error("Gemini JSON parse failed. Raw snippet:", rawText.slice(0, 400));
      throw new Error(`Gemini returned malformed JSON: ${jsonErr.message}`);
    }

    // Extract matchScore safely
    let matchScore = 50;
    if (typeof parsed.matchScore === "number") {
      matchScore = parsed.matchScore;
    } else if (typeof parsed.matchScore === "string") {
      const n = parseInt(parsed.matchScore.match(/\d+/)?.[0] ?? "50", 10);
      matchScore = isNaN(n) ? 50 : n;
    }

    const result = {
      title:               parsed.title || "Interview Preparation Report",
      matchScore,
      technicalQuestions:  normalizeQuestions(parsed.technicalQuestions),
      behavioralQuestions: normalizeQuestions(parsed.behavioralQuestions),
      skillGaps:           normalizeSkillGaps(parsed.skillGaps),
      preparationPlan:     normalizePreparationPlan(parsed.preparationPlan),
    };

    // Log if AI still under-delivered
    if (!result.technicalQuestions.length || !result.behavioralQuestions.length) {
      logger.warn("Gemini under-delivered on questions. Raw snippet:", rawText.slice(0, 400));
    }

    return result;
  } catch (error) {
    logger.error("Gemini API error:", error.message);
    throw new Error(`Failed to generate interview report: ${error.message}`);
  }
}

module.exports = { generateInterviewReport };
