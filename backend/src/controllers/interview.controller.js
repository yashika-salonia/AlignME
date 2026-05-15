const pdfParseModule = require("pdf-parse");
const PDFParse =
  typeof pdfParseModule === "function"
    ? pdfParseModule
    : pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse;
const {
  generateInterviewReport,
  generateResumePdf,
} = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
  const { selfDescription, jobDescription } = req.body;
  let resumeText = "";

  if (req.file) {
    const isPdf =
      req.file.mimetype === "application/pdf" ||
      req.file.originalname?.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      return res.status(400).json({
        message: "Please upload a valid PDF resume.",
      });
    }

    try {
      const parser = new PDFParse({ data: req.file.buffer });
      const loadedDoc = await parser.load();
      const resumeTextContent = await parser.getText();
      resumeText =
        typeof resumeTextContent === "string"
          ? resumeTextContent
          : resumeTextContent?.text || "";

      if (!resumeText.trim()) {
        console.warn(
          "⚠️ PDF file is empty or contains no extractable text. It may be a scanned/image-only PDF or a protected file.",
        );
      }
    } catch (error) {
      console.error("❌ PDF parsing error:", error.message);
      console.error("❌ Error details:", error);
      return res.status(400).json({
        message:
          "Unable to parse the uploaded resume. Please ensure the PDF is valid and contains extractable text.",
      });
    }
  }

  if (
    !jobDescription?.trim() &&
    !selfDescription?.trim() &&
    !resumeText.trim()
  ) {
    return res.status(400).json({
      message: req.file
        ? "The uploaded resume could not be parsed. Please upload a searchable PDF or add a job description/self description."
        : "Please provide a job description, self description, or resume to generate a report.",
    });
  }

  try {
    let interViewReportByAi = await generateInterviewReport({
      resume: resumeText,
      selfDescription,
      jobDescription,
    });

    // 🛠️ FIX: PARSE STRINGIFIED AI RESPONSES & SANITIZE ARRAYS

    const fieldsToParse = [
      "technicalQuestions",
      "behavioralQuestions",
      "skillGaps",
      "preparationPlan",
    ];

    const normalizeArrayField = (fieldValue, field) => {
      if (!Array.isArray(fieldValue)) {
        return [];
      }

      return fieldValue
        .map((item, index) => {
          if (item && typeof item === "object" && !Array.isArray(item)) {
            if (
              field === "technicalQuestions" ||
              field === "behavioralQuestions"
            ) {
              const question = String(
                item.question ||
                  item.text ||
                  item.prompt ||
                  item.statement ||
                  item.questionText ||
                  "",
              ).trim();
              const intention =
                String(
                  item.intention ||
                    item.intent ||
                    item.purpose ||
                    "No intention provided",
                ).trim() || "No intention provided";
              const answer =
                String(
                  item.answer ||
                    item.answerText ||
                    item.response ||
                    "No answer available",
                ).trim() || "No answer available";

              // Always return an object with the required fields, even if question is empty
              return {
                question: question || `Question ${index + 1}`,
                intention,
                answer,
              };
            }

            if (field === "skillGaps") {
              const skill = String(
                item.skill || item.name || item.topic || "",
              ).trim();
              const severity = String(item.severity || item.level || "medium")
                .trim()
                .toLowerCase();
              return skill
                ? {
                    skill,
                    severity: ["low", "medium", "high"].includes(severity)
                      ? severity
                      : "medium",
                  }
                : null;
            }

            if (field === "preparationPlan") {
              const dayValue =
                item.day ?? item.dayNumber ?? item.step ?? index + 1;
              const day =
                typeof dayValue === "number"
                  ? dayValue
                  : parseInt(String(dayValue).replace(/\D/g, ""), 10) ||
                    index + 1;
              const focus =
                String(
                  item.focus ||
                    item.title ||
                    item.summary ||
                    item.description ||
                    "No focus provided",
                ).trim() || "No focus provided";
              const tasks = Array.isArray(item.tasks)
                ? item.tasks
                    .map((task) => String(task || "").trim())
                    .filter(Boolean)
                : [];

              return { day, focus, tasks };
            }

            return item;
          }

          if (typeof item === "string") {
            const cleanItem = item
              .replace(/```json/g, "")
              .replace(/```/g, "")
              .trim();

            try {
              const parsedItem = JSON.parse(cleanItem);
              if (
                parsedItem &&
                typeof parsedItem === "object" &&
                !Array.isArray(parsedItem)
              ) {
                return normalizeArrayField([parsedItem], field)[0];
              }
            } catch (e) {
              const fallback = (() => {
                switch (field) {
                  case "technicalQuestions":
                  case "behavioralQuestions":
                    return {
                      question: cleanItem,
                      intention: "No intention provided",
                      answer: "No answer available",
                    };
                  case "skillGaps":
                    return { skill: cleanItem, severity: "medium" };
                  case "preparationPlan":
                    return {
                      day: index + 1,
                      focus: cleanItem || "No focus provided",
                      tasks: [],
                    };
                  default:
                    return null;
                }
              })();
              return fallback;
            }
          }

          return null;
        })
        .filter(
          (item) => item && typeof item === "object" && !Array.isArray(item),
        );
    };

    fieldsToParse.forEach((field) => {
      if (!interViewReportByAi[field]) {
        interViewReportByAi[field] = [];
        return;
      }

      if (typeof interViewReportByAi[field] === "string") {
        try {
          interViewReportByAi[field] = JSON.parse(interViewReportByAi[field]);
        } catch (e) {
          console.warn(`⚠️ Failed to parse ${field} string to JSON`);
        }
      }

      interViewReportByAi[field] = normalizeArrayField(
        interViewReportByAi[field],
        field,
      );

      if (field === "preparationPlan") {
        interViewReportByAi.preparationPlan =
          interViewReportByAi.preparationPlan.map((plan, index) => {
            if (plan && typeof plan.day === "string") {
              const numericDay = parseInt(plan.day.replace(/\D/g, ""), 10);
              plan.day = isNaN(numericDay) ? index + 1 : numericDay;
            }
            return plan;
          });
      }
    });

    const interviewReport = await interviewReportModel.create({
      user: req.user.id,
      resume: resumeText,
      selfDescription,
      jobDescription,
      ...interViewReportByAi,
    });

    res.status(201).json({
      message: "Interview report generated successfully.",
      interviewReport,
    });
  } catch (error) {
    console.error("❌ Interview report generation failed:", error);
    console.error("❌ Error stack:", error.stack);

    return res.status(500).json({
      message:
        error.message ||
        "Unable to generate interview report. Please check your input and try again.",
    });
  }
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
  const { interviewId } = req.params;

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewId,
    user: req.user.id,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  res.status(200).json({
    message: "Interview report fetched successfully.",
    interviewReport,
  });
}

/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
  const interviewReports = await interviewReportModel
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select(
      "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan",
    );

  res.status(200).json({
    message: "Interview reports fetched successfully.",
    interviewReports,
  });
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
  const { interviewReportId } = req.params;

  const interviewReport =
    await interviewReportModel.findById(interviewReportId);

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  const { resume, jobDescription, selfDescription } = interviewReport;

  const pdfBuffer = await generateResumePdf({
    resume,
    jobDescription,
    selfDescription,
  });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
  });

  res.send(pdfBuffer);
}

module.exports = {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
};
