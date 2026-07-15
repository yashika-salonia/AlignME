import apiClient from "../../../services/apiClient";

/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({
  jobDescription,
  selfDescription,
  resumeFile,
}) => {
  const formData = new FormData();
  formData.append("jobDescription", jobDescription || "");
  formData.append("selfDescription", selfDescription || "");

  if (resumeFile) {
    // This correctly matches upload.single("resume") on your backend
    formData.append("resume", resumeFile);
  }

  try {
    const response = await apiClient.post("/api/interview/", formData);

    return response.data;
  } catch (err) {
    const apiMessage =
      err.response?.data?.message ||
      err.response?.data?.error?.message ||
      err.response?.data?.error?.errors?.[0]?.message;

    if (apiMessage) {
      throw new Error(apiMessage);
    }

    const rawMessage =
      err.message || "Unable to generate the interview report.";
    const safeMessage =
      typeof rawMessage === "string" && rawMessage.trim().startsWith("{")
        ? "Unable to generate the interview report. Please try again later."
        : rawMessage;

    throw new Error(safeMessage);
  }
};

/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
  const response = await apiClient.get(`/api/interview/report/${interviewId}`);

  return response.data;
};

/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
  const response = await apiClient.get("/api/interview/");

  return response.data;
};
