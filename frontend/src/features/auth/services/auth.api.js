import apiClient from "../../../services/apiClient";

export async function register({ username, email, password }) {
  try {
    const response = await apiClient.post("/api/auth/register", {
      username,
      email,
      password,
    });

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

export async function login({ email, password }) {
  try {
    const response = await apiClient.post("/api/auth/login", {
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
    const response = await apiClient.post("/api/auth/logout");

    return response.data;
  } catch (err) {
    console.error("Logout failed:", err);
    throw err;
  }
}

export async function getMe() {
  try {
    const response = await apiClient.get("/api/auth/get-me");

    return response.data;
  } catch (err) {
    throw err;
  }
}
