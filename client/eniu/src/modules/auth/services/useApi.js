import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";

import { useAuth } from "../hooks/useAuth";

const BASE_URL = import.meta.env.VITE_API_URL.replace(/\/$/, "");
const PUBLIC_AUTH_ROUTES = new Set([
  "auth/login",
  "auth/google",
  "auth/register",
  "auth/forgot-password",
  "auth/reset-password",
]);

async function readResponse(response) {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function useApi(route = "") {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refreshToken = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    if (!refresh) return false;

    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { Authorization: `Bearer ${refresh}` },
      });
      if (!response.ok) return false;

      const data = await readResponse(response);
      if (!data?.access_token) return false;

      localStorage.setItem("access_token", data.access_token);
      return true;
    } catch {
      return false;
    }
  }, []);

  const request = useCallback(async ({
    method = "GET",
    path = route,
    data,
    formData,
    signal,
  } = {}) => {
    if (mountedRef.current) {
      setLoading(true);
      setError(null);
    }

    const normalizedPath = path.replace(/^\//, "");
    const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.has(normalizedPath);

    try {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const token = localStorage.getItem("access_token");
        const headers = {
          ...(formData ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };

        const response = await fetch(`${BASE_URL}/${normalizedPath}`, {
          method,
          headers,
          body: formData || (data === undefined ? undefined : JSON.stringify(data)),
          signal,
        });

        if (response.status === 401 && !isPublicAuthRoute) {
          const refreshed = attempt === 0 && await refreshToken();
          if (refreshed) continue;

          logout();
          navigate("/login", { replace: true });
          return { ok: false, status: 401, data: null };
        }

        const responseData = await readResponse(response);
        return {
          ok: response.ok,
          status: response.status,
          data: responseData,
        };
      }
    } catch (requestError) {
      if (requestError.name === "AbortError") {
        return { ok: false, status: 0, data: null, aborted: true };
      }

      if (mountedRef.current) setError(requestError.message);
      return { ok: false, status: 0, data: null };
    } finally {
      if (mountedRef.current) setLoading(false);
    }

    return { ok: false, status: 401, data: null };
  }, [logout, navigate, refreshToken, route]);

  const get = useCallback(
    (options = {}) => request({ ...options, method: "GET" }),
    [request]
  );
  const post = useCallback(
    (data, options = {}) => request({ ...options, method: "POST", data }),
    [request]
  );
  const postForm = useCallback(
    (formData, options = {}) => request({ ...options, method: "POST", formData }),
    [request]
  );
  const patch = useCallback(
    (data, options = {}) => request({ ...options, method: "PATCH", data }),
    [request]
  );
  const patchForm = useCallback(
    (formData, options = {}) => request({ ...options, method: "PATCH", formData }),
    [request]
  );
  const remove = useCallback(
    (options = {}) => request({ ...options, method: "DELETE" }),
    [request]
  );

  return {
    request,
    get,
    post,
    postForm,
    patch,
    patchForm,
    remove,
    loading,
    error,
  };
}
