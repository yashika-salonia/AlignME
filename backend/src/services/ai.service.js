const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const DEFAULT_GEMINI_MODEL = process.env.GOOGLE_GENAI_MODEL || "gemini-2.5-flash";

const ai = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
});

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .default(50)
    .describe(
      "A score between 0 and 100 indicating how well the candidate's profile matches the job description, based on the analysis of resume, self-description and job description",
    ),
  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question can be asked in the interview"),
        intention: z
          .string()
          .describe("The intention of interviewer behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc.",
          ),
      }),
    )
    .default([])
    .describe(
      "Technical questions that can be asked in the interview along with their intention and how to answer them",
    ),
  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question can be asked in the interview"),
        intention: z
          .string()
          .describe("The intention of interviewer behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc.",
          ),
      }),
    )
    .default([])
    .describe(
      "Behavioral questions that can be asked in the interview along with their intention and how to answer them",
    ),
  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z
          .enum(["low", "medium", "high"])
          .default("medium")
          .describe(
            "The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances",
          ),
      }),
    )
    .default([])
    .describe(
      "List of skill gaps in the candidate's profile along with their severity",
    ),
  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe("The day number in the preparation plan, starting from 1"),
        focus: z
          .string()
          .describe(
            "The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc.",
          ),
        tasks: z
          .array(z.string())
          .default([])
          .describe(
            "List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.",
          ),
      }),
    )
    .default([])
    .describe(
      "A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively",
    ),
  title: z
    .string()
    .default("Interview Preparation Report")
    .describe(
      "The title of the job for which the interview report is generated",
    ),
});

async function generateInterviewReport({
  resume,
  selfDescription,
  jobDescription,
}) {
  const prompt = `Generate an interview report for a candidate with the following details:
Resume: ${resume || "Not provided"}
Self Description: ${selfDescription || "Not provided"}
Job Description: ${jobDescription || "Not provided"}

Return only a valid JSON object with the following keys:
- matchScore: a number from 0 to 100
- technicalQuestions: array of objects with question, intention, answer
- behavioralQuestions: array of objects with question, intention, answer
- skillGaps: array of objects with skill and severity (low, medium, high)
- preparationPlan: array of objects with day, focus, tasks
- title: string

The JSON must include at least 5 technical questions, 5 behavioral questions, 3 skill gaps, and a 7-day preparation plan. Do not include any extra text outside the JSON object.`;

  console.log("🤖 Calling Gemini API with prompt...");
  console.log("📝 Prompt length:", prompt.length);

  try {
    const response = await ai.models.generateContent({
      model: DEFAULT_GEMINI_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: zodToJsonSchema(interviewReportSchema),
      },
    });

    console.log("✅ Gemini API response received");
    console.log("📊 Response text length:", response.text.length);

    const parsedResponse = JSON.parse(response.text);
    console.log("✅ Response parsed successfully");
    console.log("📊 Parsed data keys:", Object.keys(parsedResponse));
    console.log(
      "📊 Technical questions count:",
      parsedResponse.technicalQuestions?.length || 0,
    );
    console.log(
      "📊 Behavioral questions count:",
      parsedResponse.behavioralQuestions?.length || 0,
    );
    console.log("📊 Match score:", parsedResponse.matchScore);
    console.log("📊 Title:", parsedResponse.title);

    const sanitizedResponse = {
      matchScore:
        typeof parsedResponse.matchScore === "number"
          ? parsedResponse.matchScore
          : 50,
      technicalQuestions: Array.isArray(parsedResponse.technicalQuestions)
        ? parsedResponse.technicalQuestions
        : [],
      behavioralQuestions: Array.isArray(parsedResponse.behavioralQuestions)
        ? parsedResponse.behavioralQuestions
        : [],
      skillGaps: Array.isArray(parsedResponse.skillGaps)
        ? parsedResponse.skillGaps
        : [],
      preparationPlan: Array.isArray(parsedResponse.preparationPlan)
        ? parsedResponse.preparationPlan
        : [],
      title: parsedResponse.title || "Interview Preparation Report",
    };

    if (
      !sanitizedResponse.technicalQuestions.length ||
      !sanitizedResponse.behavioralQuestions.length ||
      !sanitizedResponse.preparationPlan.length
    ) {
      console.warn(
        "⚠️ Gemini response missing expected arrays; check raw response text:",
        response.text,
      );
    }

    console.log("✅ Response sanitized and ready for database");
    return sanitizedResponse;
  } catch (error) {
    console.error("❌ Gemini API Error:", error.message);
    console.error("❌ Error details:", error);
    throw new Error(`Failed to generate interview report: ${error.message}`);
  }
}

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  return pdfBuffer;
}

async function generateResumePdf({ resume, selfDescription, jobDescription }) {
  const resumePdfSchema = z.object({
    html: z
      .string()
      .describe(
        "The HTML content of the resume which can be converted to PDF using any library like puppeteer",
      ),
  });

  const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        The response should be a JSON object with a single field "html" containing the HTML content of the resume.
                        The HTML should be simple, professional, and easy to convert to PDF using puppeteer.

                        Resume requirements:
                        - Include sections: Name & contact summary, Professional Summary, Skills, Experience, Education, Projects, Certifications/Achievements, and Additional Strengths.
                        - Use a clean font-size hierarchy: 20px for the candidate name, 16px for section headings, and 12px-14px for body text.
                        - Include subtle styling using inline CSS or simple HTML classes for headings and section labels.
                        - Keep the layout ATS-friendly, with clear section headings and bullet lists.
                        - Make it tailored to the given job description and highlight the most relevant experience and skills.
                        - Keep it concise: 1-2 pages long when converted to PDF.
                        - Do not make the resume sound generated by AI; use natural, human-like language.
                    `;

  const response = await ai.models.generateContent({
    model: DEFAULT_GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: zodToJsonSchema(resumePdfSchema),
    },
  });

  const jsonContent = JSON.parse(response.text);

  const pdfBuffer = await generatePdfFromHtml(jsonContent.html);

  return pdfBuffer;
}

module.exports = { generateInterviewReport, generateResumePdf };
