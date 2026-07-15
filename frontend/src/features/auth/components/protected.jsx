import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import React from "react";

/**
 * Protected route wrapper.
 *
 * - While the one-time session restore is running (authInitialised === false),
 *   render a minimal transparent placeholder so there is no layout shift
 *   and no flash-redirect to /login before the token check completes.
 * - Once initialised: if no user → redirect /login, otherwise render children.
 */
const Protected = ({ children }) => {
  const { authInitialised, user } = useAuth();

  if (!authInitialised) {
    // Invisible placeholder — avoids flash-of-redirect while the single
    // getMe() call resolves. Typically < 300 ms on a fast connection.
    return (
      <div
        aria-hidden="true"
        style={{ minHeight: "100vh", background: "#0d1117" }}
      />
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default Protected;
