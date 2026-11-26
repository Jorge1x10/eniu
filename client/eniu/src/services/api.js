import axios from "axios";

import { refreshAccessToken } from "./session";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

/** Rutas donde un 401 significa "credenciales incorrectas", no "sesión vencida". */
const PUBLIC_AUTH_ROUTES = new Set([
  "auth/login",
  "auth/google",
  "auth/register",
  "auth/refresh",
  "auth/forgot-password",
  "auth/reset-password",
]);

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    const path = (config?.url || "").replace(/^\//, "");

    if (
      error.response?.status !== 401 ||
      !config ||
      config._retried ||
      PUBLIC_AUTH_ROUTES.has(path)
    ) {
      return Promise.reject(error);
    }

    const token = await refreshAccessToken();
    if (!token) return Promise.reject(error);

    // El interceptor de petición vuelve a leer el token recién guardado.
    return api.request({ ...config, _retried: true });
  }
);

export default api;
