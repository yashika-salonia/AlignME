import { createContext, useState } from "react";

export const AuthContext = createContext();

// Pages that never need a session check before rendering.
// Starting authInitialised as true on these routes means login/register
// render instantly with no blank flicker or network call.
const PUBLIC_PATHS = ["/login", "/register"];
const isPublicPath = PUBLIC_PATHS.includes(window.location.pathname);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  // On public routes, skip the session restore entirely — start already initialised.
  const [authInitialised, setAuthInitialised] = useState(isPublicPath);

  return (
    <AuthContext.Provider
      value={{ user, setUser, loading, setLoading, authInitialised, setAuthInitialised }}
    >
      {children}
    </AuthContext.Provider>
  );
};
