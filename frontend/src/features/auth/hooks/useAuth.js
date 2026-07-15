import { useContext, useEffect } from "react";
import { toast } from "react-toastify";
import { AuthContext } from "../auth.context";
import { login, register, logout, getMe } from "../services/auth.api";

export const useAuth = () => {
  const context = useContext(AuthContext);
  const { user, setUser, loading, setLoading, authInitialised, setAuthInitialised } = context;

  const handleLogin = async ({ email, password }) => {
    setLoading(true);
    try {
      const data = await login({ email, password });
      setUser(data.user);
      toast.success(`Welcome back, ${data.user.username}!`);
      return data;
    } catch (err) {
      toast.error(err.message || "Login failed. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async ({ username, email, password }) => {
    setLoading(true);
    try {
      const data = await register({ username, email, password });
      setUser(data.user);
      if (data.token) {
        localStorage.setItem("alignme_token", data.token);
      }
      toast.success(`Account created! Welcome, ${data.user.username}!`);
      return data;
    } catch (err) {
      toast.error(err.message || "Registration failed. Please try again.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    const username = user?.username;
    try {
      await logout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setUser(null);
      localStorage.removeItem("alignme_token");
      setLoading(false);
      if (username) {
        toast.info(`${username} logged out. See you next time!`);
      }
    }
  };

  // One-time session restore — only runs on protected routes.
  // On public routes (login/register), authInitialised is already true
  // from the context initialiser, so this effect exits immediately.
  useEffect(() => {
    if (authInitialised) return; // already done (public route or re-render)

    const restoreSession = async () => {
      const token = localStorage.getItem("alignme_token");
      if (!token) {
        setAuthInitialised(true);
        return;
      }
      try {
        const data = await getMe();
        setUser(data.user);
      } catch {
        // Token invalid/expired — clear it silently
        localStorage.removeItem("alignme_token");
      } finally {
        setAuthInitialised(true);
      }
    };

    restoreSession();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { user, loading, authInitialised, handleRegister, handleLogin, handleLogout };
};
