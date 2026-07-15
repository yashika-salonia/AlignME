import React from "react";
import { Link } from "react-router";

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: "100vh",
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
              padding: "2.5rem 3rem",
              textAlign: "center",
              maxWidth: "420px",
              width: "100%",
            }}
          >
            <h2 style={{ marginBottom: "0.75rem" }}>Oops!</h2>
            <p style={{ marginBottom: "1.5rem", color: "#555" }}>
              Something went wrong. Please try again.
            </p>
            <button
              className="button primary-button"
              onClick={() => window.location.reload()}
              style={{ marginBottom: "0.75rem", width: "100%" }}
            >
              Reload Page
            </button>
            <br />
            <Link to="/" style={{ color: "#555", fontSize: "0.95rem" }}>
              Go Home
            </Link>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
