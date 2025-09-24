import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { fetchProfile, loginUser, logoutUser, registerUser } from "../api/auth";

const AuthContext = createContext(null);
const ACCESS_KEY = "token";
const ROLE_KEY = "role";

function persistSession({ token, role, username, email }) {
  if (token) {
    localStorage.setItem(ACCESS_KEY, token);
    if (role) localStorage.setItem(ROLE_KEY, role);
    if (username) localStorage.setItem("username", username);
    if (email) localStorage.setItem("email", email);
  }
}

function clearSession() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem("username");
  localStorage.removeItem("email");
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(ACCESS_KEY));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!token);
  const [error, setError] = useState(null);

  const syncProfile = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const profile = await fetchProfile();
      setUser(profile);
      if (profile?.role) {
        localStorage.setItem(ROLE_KEY, profile.role);
      }
    } catch (err) {
      clearSession();
      setToken(null);
      setUser(null);
      setError(err.message || "Sesión expirada");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    syncProfile();
  }, [syncProfile]);

  const handleLogin = useCallback(async ({ username, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await loginUser({ username, password });
      persistSession(data);
      setToken(data.token);
      setUser({ username: data.username, email: data.email, role: data.role });
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  }, []);

  const handleRegister = useCallback(async ({ username, email, password }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await registerUser({ username, email, password });
      persistSession(data);
      setToken(data.token);
      setUser({ username: data.username, email: data.email, role: data.role });
      setLoading(false);
      return data;
    } catch (err) {
      setLoading(false);
      setError(err.message);
      throw err;
    }
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logoutUser();
    } catch (err) {
      console.warn("Fallo al cerrar sesión en backend", err);
    }
    clearSession();
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      token,
      user,
      loading,
      error,
      isAuthenticated: Boolean(token && user),
      isAdmin: (user?.role || localStorage.getItem(ROLE_KEY)) === "admin",
      login: handleLogin,
      register: handleRegister,
      logout: handleLogout,
      refreshProfile: syncProfile,
    }),
    [token, user, loading, error, handleLogin, handleRegister, handleLogout, syncProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider");
  }
  return ctx;
}

