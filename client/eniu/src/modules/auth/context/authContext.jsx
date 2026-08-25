import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  authenticateWithGoogle,
  getCurrentUser,
  loginUser,
  registerUser,
} from "../services/authService";
import { AuthContext } from "./AuthContextValue";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    const taskId = window.setTimeout(async () => {
      const token = localStorage.getItem("access_token");
      if (!token) {
        if (isActive) setIsLoading(false);
        return;
      }

      const response = await getCurrentUser();
      if (!isActive) return;

      if (response.success) {
        setUser(response.data.user);
      } else {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        setUser(null);
      }
      setIsLoading(false);
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(taskId);
    };
  }, []);

  const saveSession = useCallback((response) => {
    localStorage.setItem("access_token", response.data.access_token);
    if (response.data.refresh_token) {
      localStorage.setItem("refresh_token", response.data.refresh_token);
    }
    setUser(response.data.user);
  }, []);

  const registerAccount = useCallback(async (userData) => {
    const response = await registerUser(userData);
    if (response.success) saveSession(response);
    return response;
  }, [saveSession]);

  const login = useCallback(async (credentials) => {
    const response = await loginUser(credentials);
    if (response.success) saveSession(response);
    return response;
  }, [saveSession]);

  const loginWithGoogle = useCallback(async (credential) => {
    const response = await authenticateWithGoogle(credential);
    if (response.success && !response.data.requires_profile_completion) {
      saveSession(response);
    }
    return response;
  }, [saveSession]);

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("selected_business_id");
    setUser(null);
  }, []);

  const startSession = useCallback((data) => {
    localStorage.setItem("access_token", data.access_token);
    localStorage.setItem("refresh_token", data.refresh_token);
    setUser(data.user);
  }, []);

  const value = useMemo(() => ({
    user,
    isLoading,
    registerAccount,
    login,
    loginWithGoogle,
    logout,
    setUser,
    startSession,
  }), [
    user,
    isLoading,
    registerAccount,
    login,
    loginWithGoogle,
    logout,
    startSession,
  ]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
