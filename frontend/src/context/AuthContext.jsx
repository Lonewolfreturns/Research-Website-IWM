import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, getToken, setToken, AUTH_EXPIRED_EVENT } from "../utils/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [authed, setAuthed] = useState(Boolean(getToken()));
  const [checking, setChecking] = useState(Boolean(getToken()));

  const verify = useCallback(async () => {
    if (!getToken()) {
      setAuthed(false);
      setChecking(false);
      return;
    }
    try {
      await api.get("/auth/me");
      setAuthed(true);
    } catch {
      setToken(null);
      setAuthed(false);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    verify();
  }, [verify]);

  // An expired/rejected token clears storage inside the axios interceptor; mirror
  // that here so the guarded routes actually bounce back to the login screen.
  useEffect(() => {
    const onExpired = () => {
      setAuthed(false);
      setChecking(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post("/auth/login", { username, password });
    setToken(data.token);
    setAuthed(true);
    return data;
  };

  const logout = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      /* ignore */
    }
    setToken(null);
    setAuthed(false);
  };

  return (
    <AuthContext.Provider value={{ authed, checking, login, logout, verify }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
