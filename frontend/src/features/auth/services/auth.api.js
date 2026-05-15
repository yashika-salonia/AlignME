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

export async function register({ username, email, password }) {
  try {
    const response = await api.post("/api/auth/register", {
      username,
      email,
      password,
    });

    return response.data;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

export async function login({ email, password }) {
  try {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    // SAVE THE TOKEN TO LOCAL STORAGE
    if (response.data.token) {
      localStorage.setItem("alignme_token", response.data.token);
    }

    return response.data;
  } catch (err) {
    if (err.response?.data?.message) {
      throw new Error(err.response.data.message);
    }
    throw err;
  }
}

export async function logout() {
  try {
    localStorage.removeItem("alignme_token");
    const response = await api.get("/api/auth/logout");

    return response.data;
  } catch (err) {
    console.error("Logout failed:", err);
    throw err;
  }
}

export async function getMe() {
  try {
    const response = await api.get("/api/auth/get-me");

    return response.data;
  } catch (err) {
    throw err;
  }
}
