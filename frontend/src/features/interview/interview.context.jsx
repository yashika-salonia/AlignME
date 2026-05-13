import { createContext, useState } from "react";

export const InterviewContext = createContext();

export const InterviewProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [loadingAction, setLoadingAction] = useState("");
  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);

  return (
    <InterviewContext.Provider
      value={{
        loading,
        setLoading,
        loadingAction,
        setLoadingAction,
        report,
        setReport,
        reports,
        setReports,
      }}
    >
      {children}
    </InterviewContext.Provider>
  );
};
