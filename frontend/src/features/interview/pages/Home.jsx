import React, { useState, useRef } from "react";
import "../style/home.scss";
import { useInterview } from "../hooks/useInterview.js";
import { useNavigate } from "react-router";
import { useAuth } from "../../auth/hooks/useAuth";
import Navbar from "../../../components/Navbar";

const Home = () => {
  const { loading, generateReport, reports } = useInterview();
  const [jobDescription, setJobDescription] = useState("");
  const [selfDescription, setSelfDescription] = useState("");
  const [error, setError] = useState("");
  const [selectedResume, setSelectedResume] = useState(null);
  const [loadingAction, setLoadingAction] = useState(""); // Track what action is loading
  const resumeInputRef = useRef();
  const jobDescriptionRef = useRef(null);
  const selfDescriptionRef = useRef(null);

  const navigate = useNavigate();

  const formatBytes = (bytes) => {
    if (!bytes) return "0 B";
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / 1024 ** i).toFixed(1)} ${sizes[i]}`;
  };

  const isPdfFile = (file) => {
    return (
      file &&
      (file.type === "application/pdf" ||
        file.name?.toLowerCase().endsWith(".pdf"))
    );
  };

  const adjustTextareaHeight = (event) => {
    const textarea = event.target;
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  };

  const handleResumeChange = (event) => {
    setError("");
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setSelectedResume(null);
      return;
    }

    if (!isPdfFile(file)) {
      setSelectedResume(null);
      event.target.value = "";
      setError("Please upload a PDF resume only.");
      return;
    }

    setSelectedResume({ file, name: file.name, size: file.size });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0] ?? null;
    if (!file) return;

    if (!isPdfFile(file)) {
      setSelectedResume(null);
      setError("Please upload a PDF resume only.");
      return;
    }

    if (resumeInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      resumeInputRef.current.files = dataTransfer.files;
    }

    setSelectedResume({ file, name: file.name, size: file.size });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
  };

  const handleRemoveResume = () => {
    setSelectedResume(null);
    setError("");
    if (resumeInputRef.current) {
      resumeInputRef.current.value = "";
    }
  };

  const handleGenerateReport = async () => {
    setError("");
    setLoadingAction("analyzing"); // Set loading action
    const resumeFile =
      selectedResume?.file ?? resumeInputRef.current?.files?.[0] ?? null;

    if (!jobDescription.trim()) {
      setError("Target job description is required.");
      setLoadingAction("");
      return;
    }

    if (!resumeFile && !selfDescription.trim()) {
      setError(
        "Please upload a resume or add a self description to generate your plan.",
      );
      setLoadingAction("");
      return;
    }

    if (resumeFile && !isPdfFile(resumeFile)) {
      setError("Please upload a PDF resume only.");
      setLoadingAction("");
      return;
    }

    try {
      const data = await generateReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });

      if (!data?._id) {
        throw new Error("Interview report generation failed.");
      }

      navigate(`/interview/${data._id}`);
    } catch (err) {
      const rawMessage =
        err?.message || "Unable to generate your interview plan.";
      const shortMessage =
        typeof rawMessage === "string" && rawMessage.trim().startsWith("{")
          ? "Unable to generate your interview plan. Please try again."
          : rawMessage;
      setError(shortMessage);
    } finally {
      setLoadingAction(""); // Clear loading action
    }
  };

  const getLoadingMessage = () => {
    const messages = {
      analyzing: "Analyzing your profile and job requirements...",
      processing: "Processing your information...",
      generating: "Generating personalized questions...",
      default: "Preparing your interview plan...",
    };
    return messages[loadingAction] || messages.default;
  };

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loading-content">
          <div className="spinner" />
          <h1>{getLoadingMessage()}</h1>
          <p className="loading-subtitle">This may take a moment...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="home-page">
      <Navbar />
      {/* Page Header */}
      <header className="page-header">
        <h1>
          Create Your Custom <span className="highlight">Interview Plan</span>
        </h1>
        <p>
          Let our AI analyze the job requirements and your unique profile to
          build a winning strategy.
        </p>
      </header>

      {/* Main Card */}
      <div className="interview-card">
        <div className="interview-card__body">
          {/* Left Panel - Job Description */}
          <div className="panel panel--left">
            <div className="panel__header">
              <span className="panel__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                </svg>
              </span>
              <h2>Target Job Description</h2>
              <span className="badge badge--required">Required</span>
            </div>
            <textarea
              ref={jobDescriptionRef}
              value={jobDescription}
              onChange={(e) => {
                setJobDescription(e.target.value);
                adjustTextareaHeight(e);
              }}
              onFocus={adjustTextareaHeight}
              className="panel__textarea"
              aria-required="true"
              required
              placeholder={`Paste the full job description here...\ne.g. 'Senior Frontend Engineer at Google requires proficiency in React, TypeScript, and large-scale system design...'`}
              maxLength={5000}
            />
            <div className="char-counter">
              {jobDescription.length} / 5000 chars
            </div>
          </div>

          {/* Vertical Divider */}
          <div className="panel-divider" />

          {/* Right Panel - Profile */}
          <div className="panel panel--right">
            <div className="panel__header">
              <span className="panel__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <h2>Your Profile</h2>
            </div>

            {/* Upload Resume */}
            <div className="upload-section">
              <label className="section-label">
                Upload Resume
                <span className="badge badge--best">Best Results</span>
              </label>
              <label
                className="dropzone"
                htmlFor="resume"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <span className="dropzone__icon">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="16 16 12 12 8 16" />
                    <line x1="12" y1="12" x2="12" y2="21" />
                    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
                  </svg>
                </span>
                <p className="dropzone__title">
                  Click to upload or drag a PDF here
                </p>
                <p className="dropzone__subtitle">PDF only (Max 3MB)</p>
                <input
                  ref={resumeInputRef}
                  hidden
                  type="file"
                  id="resume"
                  name="resume"
                  accept=".pdf"
                  onChange={handleResumeChange}
                />
              </label>
              {selectedResume && (
                <div className="resume-preview">
                  <div className="resume-preview__meta">
                    <p className="resume-preview__name">
                      <strong>Selected resume:</strong> {selectedResume.name}
                    </p>
                    <button
                      type="button"
                      className="remove-resume-btn"
                      onClick={handleRemoveResume}
                      aria-label="Remove selected resume"
                    >
                      ×
                    </button>
                  </div>
                  <p className="resume-preview__size">
                    {formatBytes(selectedResume.size)}
                  </p>
                </div>
              )}
            </div>

            {/* OR Divider */}
            <div className="or-divider">
              <span>OR</span>
            </div>

            {/* Quick Self-Description */}
            <div className="self-description">
              <label className="section-label" htmlFor="selfDescription">
                Quick Self-Description
              </label>
              <textarea
                ref={selfDescriptionRef}
                value={selfDescription}
                onChange={(e) => {
                  setSelfDescription(e.target.value);
                  adjustTextareaHeight(e);
                }}
                onFocus={adjustTextareaHeight}
                id="selfDescription"
                name="selfDescription"
                className="panel__textarea panel__textarea--short"
                placeholder="Briefly describe your experience, key skills, and years of experience if you don't have a resume handy..."
                maxLength={5000}
              />
              <div className="char-counter char-counter--self">
                {selfDescription.length} / 5000 chars
              </div>
            </div>

            {/* Info Box */}
            <div className="info-box">
              <span className="info-box__icon">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line
                    x1="12"
                    y1="8"
                    x2="12"
                    y2="12"
                    stroke="#1a1f27"
                    strokeWidth="2"
                  />
                  <line
                    x1="12"
                    y1="16"
                    x2="12.01"
                    y2="16"
                    stroke="#1a1f27"
                    strokeWidth="2"
                  />
                </svg>
              </span>
              <p>
                Either a <strong>Resume</strong> or a{" "}
                <strong>Self Description</strong> is required to generate a
                personalized plan.
              </p>
            </div>
          </div>
        </div>

        {/* Card Footer */}
        <div className="interview-card__footer">
          <span className="footer-info">
            AI-Powered Strategy Generation &bull; Approx 30s
          </span>
          <div className="footer-actions">
            {error && <p className="form-error">{error}</p>}
            <button
              type="button"
              onClick={handleGenerateReport}
              className="generate-btn"
              disabled={loading}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
              </svg>
              Generate My Interview Strategy
            </button>
          </div>
        </div>
      </div>

      {/* Recent Reports List */}
      {reports.length > 0 && (
        <section className="recent-reports">
          <h2>My Recent Interview Plans</h2>
          <ul className="reports-list">
            {reports.map((report) => (
              <li
                key={report._id}
                className="report-item"
                onClick={() => navigate(`/interview/${report._id}`)}
              >
                <h3>{report.title || "Untitled Position"}</h3>
                <p className="report-meta">
                  Generated on {new Date(report.createdAt).toLocaleDateString()}
                </p>
                <p
                  className={`match-score ${report.matchScore >= 80 ? "score--high" : report.matchScore >= 60 ? "score--mid" : "score--low"}`}
                >
                  Match Score: {report.matchScore}%
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Page Footer */}
      <footer className="page-footer">
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
        <a href="#">Help Center</a>
      </footer>
    </div>
  );
};

export default Home;
