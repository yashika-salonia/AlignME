import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
} from "../services/interview.api";
import { useContext, useEffect } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  const {
    loading,
    setLoading,
    loadingAction,
    setLoadingAction,
    report,
    setReport,
    reports,
    setReports,
  } = context;

  const generateReport = async ({
    jobDescription,
    selfDescription,
    resumeFile,
  }) => {
    setLoadingAction("generatingReport");
    setLoading(true);
    let response = null;
    try {
      console.log("🤖 Calling AI service to generate report...");
      response = await generateInterviewReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });
      setReport(response.interviewReport);
      return response.interviewReport;
    } catch (error) {
      console.log(error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  const getReportById = async (interviewId) => {
    setLoadingAction("fetchingReport");
    setLoading(true);
    let response = null;
    try {
      response = await getInterviewReportById(interviewId);
      setReport(response.interviewReport);
      return response.interviewReport;
    } catch (error) {
      console.error("❌ Error fetching report:", error);
      throw error;
    } finally {
      setLoading(false);
      setLoadingAction("");
    }
  };

  const getReports = async () => {
    setLoadingAction("fetchingReports");
    setLoading(true);
    let response = null;
    try {
      response = await getAllInterviewReports();
      setReports(response.interviewReports);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
      setLoadingAction("");
    }

    return response.interviewReports;
  };

  useEffect(() => {
    if (!interviewId) {
      getReports();
    }
  }, [interviewId]);

  return {
    loading,
    loadingAction,
    report,
    reports,
    generateReport,
    getReportById,
    getReports,
  };
};
