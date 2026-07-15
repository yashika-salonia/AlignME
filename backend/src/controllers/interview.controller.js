const { PDFParse } = require("pdf-parse");
const { generateInterviewReport } = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");
const asyncHandler = require("../utils/asyncHandler");
const logger = require("../utils/logger");

/**
 * @description Generate an interview report from resume PDF, self-description, and job description.
 */
async function generateInterViewReportController(req, res) {
  const { selfDescription, jobDescription } = req.body;
  let resumeText = "";

  if (req.file) {
    try {
      // pdf-parse (this version): new PDFParse({ data: buffer }) → .load() → .getText()
      // getText() returns an object { text: string, pages: [...] }
      const parser = new PDFParse({ data: req.file.buffer });
      await parser.load();
      const result = await parser.getText();
      resumeText = typeof result === "string"
        ? result.trim()
        : (result?.text ?? "").trim();

      if (!resumeText) {
        logger.warn(
          "PDF file contains no extractable text. It may be scanned or image-only.",
        );
      }
    } catch (error) {
      logger.error("PDF parsing failed:", error.message);
      return res.status(400).json({
        message:
          "Unable to parse the uploaded resume. Please ensure the PDF is a searchable (text-based) file.",
      });
    }
  }

  if (!jobDescription?.trim() && !selfDescription?.trim() && !resumeText) {
    return res.status(400).json({
      message:
        "Please provide at least a job description, self-description, or resume to generate a report.",
    });
  }

  const interViewReportByAi = await generateInterviewReport({
    resume: resumeText,
    selfDescription: selfDescription?.trim() || "",
    jobDescription: jobDescription?.trim() || "",
  });

  const interviewReport = await interviewReportModel.create({
    user: req.user.id,
    resume: resumeText,
    selfDescription: selfDescription?.trim() || "",
    jobDescription: jobDescription?.trim() || "",
    ...interViewReportByAi,
  });

  res.status(201).json({
    message: "Interview report generated successfully.",
    interviewReport,
  });
}

/**
 * @description Get a single interview report by ID (must belong to the requesting user).
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
 * @description Get all interview reports for the logged-in user (list view — excludes heavy fields).
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

module.exports = {
  generateInterViewReportController: asyncHandler(generateInterViewReportController),
  getInterviewReportByIdController: asyncHandler(getInterviewReportByIdController),
  getAllInterviewReportsController: asyncHandler(getAllInterviewReportsController),
};
