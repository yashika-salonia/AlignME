import React, { useState, useEffect } from "react";
import "../style/interview.scss";
import { useInterview } from "../hooks/useInterview.js";
import { useNavigate, useParams } from "react-router";
import Navbar from "../../../components/Navbar";

const NAV_ITEMS = [
  {
    id: "technical",
    label: "Technical Questions",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
  {
    id: "behavioral",
    label: "Behavioral Questions",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "roadmap",
    label: "Road Map",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="3 11 22 2 13 21 11 13 3 11" />
      </svg>
    ),
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────
const safeExtractText = (value) => {
  if (!value) return "";
  if (typeof value === "string") {
    try {
      // Try to parse as JSON and extract text
      const parsed = JSON.parse(value);
      if (typeof parsed === "string") return parsed;
      if (parsed.question) return parsed.question;
      if (parsed.text) return parsed.text;
      return JSON.stringify(parsed, null, 2);
    } catch (e) {
      return value;
    }
  }
  if (typeof value === "object" && value !== null) {
    return String(value);
  }
  return String(value);
};

const QuestionCard = ({ item, index }) => {
  const [open, setOpen] = useState(false);

  // Safely extract question text
  let questionText = "";
  if (typeof item === "string") {
    try {
      const parsed = JSON.parse(item);
      questionText =
        parsed.question || parsed.text || parsed.prompt || "No question text";
    } catch (e) {
      questionText = item;
    }
  } else if (typeof item === "object") {
    questionText =
      item.question ||
      item.text ||
      item.prompt ||
      item.statement ||
      item.questionText ||
      "No question text";
  } else {
    questionText = String(item);
  }

  // Safely extract intention
  let intentionText = "";
  if (typeof item === "object") {
    intentionText =
      item.intention?.trim() || item.intent?.trim() || "No intention provided.";
  }

  // Safely extract answer
  let answerText = "";
  if (typeof item === "object") {
    answerText =
      item.answer?.trim() ||
      item.answerText?.trim() ||
      item.response?.trim() ||
      "No model answer available.";
  }

  return (
    <div className="q-card">
      <div className="q-card__header" onClick={() => setOpen((o) => !o)}>
        <span className="q-card__index">Q{index + 1}</span>
        <p className="q-card__question">{questionText}</p>
        <span
          className={`q-card__chevron ${open ? "q-card__chevron--open" : ""}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {open && (
        <div className="q-card__body">
          <div className="q-card__section">
            <span className="q-card__tag q-card__tag--intention">
              Intention
            </span>
            <p>{intentionText}</p>
          </div>
          <div className="q-card__section">
            <span className="q-card__tag q-card__tag--answer">
              Model Answer
            </span>
            <p>{answerText}</p>
          </div>
        </div>
      )}
    </div>
  );
};

const RoadMapDay = ({ day }) => {
  // Safely extract focus text
  let focusText = "";
  if (typeof day === "string") {
    try {
      const parsed = JSON.parse(day);
      focusText = parsed.focus || "No focus provided";
    } catch (e) {
      focusText = day;
    }
  } else {
    focusText = day.focus || "No focus provided";
  }

  // Safely extract tasks
  let tasks = [];
  if (typeof day === "object" && Array.isArray(day.tasks)) {
    tasks = day.tasks;
  } else if (typeof day === "object" && day.tasks) {
    tasks = Array.isArray(day.tasks) ? day.tasks : [];
  }

  return (
    <div className="roadmap-day">
      <div className="roadmap-day__header">
        <span className="roadmap-day__badge">Day {day.day}</span>
        <h3 className="roadmap-day__focus">{focusText}</h3>
      </div>
      <ul className="roadmap-day__tasks">
        {tasks.map((task, i) => (
          <li key={i}>
            <span className="roadmap-day__bullet" />
            {typeof task === "string" ? task : JSON.stringify(task)}
          </li>
        ))}
      </ul>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const Interview = () => {
  const [activeNav, setActiveNav] = useState("technical");
  const [error, setError] = useState("");
  const [loadingStage, setLoadingStage] = useState("fetching");
  const { report, getReportById, loading, loadingAction } = useInterview();
  const { interviewId } = useParams();

  useEffect(() => {
    if (interviewId) {
      setLoadingStage("fetching");
      getReportById(interviewId)
        .then(() => setLoadingStage("loaded"))
        .catch((err) => {
          console.error("❌ Failed to load report:", err);
          setError(err.message || "Unable to load this interview report.");
        });
    }
  }, [interviewId]);

  const getLoadingMessage = () => {
    const messages = {
      fetching:  "Retrieving your interview plan...",
      processing: "Processing your analysis...",
      generating: "Generating questions and recommendations...",
      loaded:    "Loading complete...",
    };
    return messages[loadingStage] || messages.fetching;
  };

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="loading-content">
          <div className="spinner" />
          <h1>{getLoadingMessage()}</h1>
          <p className="loading-subtitle">
            Please wait while we prepare your interview plan...
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="loading-screen">
        <div className="loading-content">
          <p className="form-error">{error}</p>
        </div>
      </main>
    );
  }

  if (!report) {
    return (
      <main className="loading-screen">
        <div className="loading-content">
          <p className="form-error">Interview report not found.</p>
        </div>
      </main>
    );
  }

  const technicalQuestions = Array.isArray(report.technicalQuestions)
    ? report.technicalQuestions
    : [];
  const behavioralQuestions = Array.isArray(report.behavioralQuestions)
    ? report.behavioralQuestions
    : [];
  const preparationPlan = Array.isArray(report.preparationPlan)
    ? report.preparationPlan
    : [];
  const skillGaps = Array.isArray(report.skillGaps) ? report.skillGaps : [];

  const scoreColor =
    Number(report.matchScore) >= 80
      ? "score--high"
      : Number(report.matchScore) >= 60
        ? "score--mid"
        : "score--low";

  const matchStatus =
    report.matchScore >= 80
      ? "Strong match for this role"
      : report.matchScore >= 60
        ? "Moderate match, consider improving your fit"
        : "Low match, focus on strengthening your profile";

  const emptyContentMessage = (section) => {
    switch (section) {
      case "technical":
        return "No technical questions were generated. Try adding more detail to your profile or job description.";
      case "behavioral":
        return "No behavioral questions were generated. Try adding more detail to your profile or job description.";
      case "roadmap":
        return "No roadmap was generated. Try providing a clearer job description or background.";
      default:
        return "No content available.";
    }
  };

  return (
    <div className="interview-page">
      <Navbar />
      <div className="interview-layout">
        {/* ── Left Nav ── */}
        <nav className="interview-nav">
          <div className="nav-content">
            <p className="interview-nav__label">Sections</p>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                className={`interview-nav__item ${activeNav === item.id ? "interview-nav__item--active" : ""}`}
                onClick={() => setActiveNav(item.id)}
              >
                <span className="interview-nav__icon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="interview-divider" />

        {/* ── Center Content ── */}
        <main className="interview-content">
          {activeNav === "technical" && (
            <section>
              <div className="content-header">
                <h2>Technical Questions</h2>
                <span className="content-header__count">
                  {technicalQuestions.length} questions
                </span>
              </div>
              <div className="q-list">
                {technicalQuestions.length > 0 ? (
                  technicalQuestions.map((q, i) => (
                    <QuestionCard key={i} item={q} index={i} />
                  ))
                ) : (
                  <p className="empty-state">
                    {emptyContentMessage("technical")}
                  </p>
                )}
              </div>
            </section>
          )}

          {activeNav === "behavioral" && (
            <section>
              <div className="content-header">
                <h2>Behavioral Questions</h2>
                <span className="content-header__count">
                  {behavioralQuestions.length} questions
                </span>
              </div>
              <div className="q-list">
                {behavioralQuestions.length > 0 ? (
                  behavioralQuestions.map((q, i) => (
                    <QuestionCard key={i} item={q} index={i} />
                  ))
                ) : (
                  <p className="empty-state">
                    {emptyContentMessage("behavioral")}
                  </p>
                )}
              </div>
            </section>
          )}

          {activeNav === "roadmap" && (
            <section>
              <div className="content-header">
                <h2>Preparation Road Map</h2>
                <span className="content-header__count">
                  {preparationPlan.length}-day plan
                </span>
              </div>
              <div className="roadmap-list">
                {preparationPlan.length > 0 ? (
                  preparationPlan.map((day) => (
                    <RoadMapDay key={day.day} day={day} />
                  ))
                ) : (
                  <p className="empty-state">
                    {emptyContentMessage("roadmap")}
                  </p>
                )}
              </div>
            </section>
          )}
        </main>

        <div className="interview-divider" />

        {/* ── Right Sidebar ── */}
        <aside className="interview-sidebar">
          {/* Match Score */}
          <div className="match-score">
            <p className="match-score__label">Match Score</p>
            <div className={`match-score__ring ${scoreColor}`}>
              <span className="match-score__value">{report.matchScore}</span>
              <span className="match-score__pct">%</span>
            </div>
            <p className="match-score__sub">{matchStatus}</p>
          </div>

          <div className="sidebar-divider" />

          {/* Skill Gaps */}
          <div className="skill-gaps">
            <p className="skill-gaps__label">Skill Gaps</p>
            <div className="skill-gaps__list">
              {skillGaps.length > 0 ? (
                skillGaps.map((gap, i) => (
                  <span
                    key={i}
                    className={`skill-tag skill-tag--${gap.severity}`}
                  >
                    {gap.skill}
                  </span>
                ))
              ) : (
                <p className="empty-state">No skill gaps were generated yet.</p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default Interview;
