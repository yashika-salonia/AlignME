import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("alignme_token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

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
    const response = await api.post("/api/interview/", formData,);

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
  const response = await api.get(`/api/interview/report/${interviewId}`);

  return response.data;
};

/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
  const response = await api.get("/api/interview/");

  return response.data;
};

/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
  const response = await api.post(
    `/api/interview/resume/pdf/${interviewReportId}`,
    null,
    {
      responseType: "blob",
    },
  );

  return response.data;
};
