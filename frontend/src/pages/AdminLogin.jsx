import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const SECRET_PATH = process.env.REACT_APP_ADMIN_SECRET_PATH || "x7k2-manage-9qp";

export default function AdminLogin() {
  const { login, authed, checking } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [lockSeconds, setLockSeconds] = useState(0);

  useEffect(() => {
    // noindex meta
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    const t = document.title;
    document.title = "Restricted · IWM";
    return () => {
      document.head.removeChild(m);
      document.title = t;
    };
  }, []);

  useEffect(() => {
    if (!checking && authed) nav(`/${SECRET_PATH}/dashboard`, { replace: true });
  }, [authed, checking, nav]);

  useEffect(() => {
    if (lockSeconds <= 0) return;
    const t = setInterval(() => setLockSeconds((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [lockSeconds]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (lockSeconds > 0) return;
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      nav(`/${SECRET_PATH}/dashboard`, { replace: true });
    } catch (err) {
      const status = err?.response?.status;
      const retry = Number(err?.response?.headers?.["retry-after"] || 0);
      if (status === 429 && retry > 0) {
        setLockSeconds(retry);
        setError(`Too many attempts. Try again in ${retry}s.`);
      } else {
        setError("Invalid credentials");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F2EFEA] flex items-center justify-center px-4" data-testid="admin-login-page">
      <div className="w-full max-w-md border hairline bg-[#F9F8F6] p-8">
        <div className="flex items-center gap-2 overline mb-6"><Lock size={12} /> Restricted · Admin</div>
        <h1 className="font-serif text-4xl text-[#1C2722] leading-tight">Authorised access only.</h1>
        <p className="mt-3 text-sm text-[#4A5A52]">
          This page is not indexed and not linked from the public site. Please sign in with your
          administrator credentials.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
          <label className="block">
            <span className="overline block mb-2">Username</span>
            <input
              type="text"
              className="field"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              data-testid="admin-username"
            />
          </label>
          <label className="block">
            <span className="overline block mb-2">Password</span>
            <input
              type="password"
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              data-testid="admin-password"
            />
          </label>

          {error && (
            <div className="flex items-center gap-2 border px-3 py-2 text-[13px] text-[#96402A]"
                 style={{ borderColor: "#B95438", background: "#FBEFEA" }}
                 data-testid="admin-login-error">
              <AlertTriangle size={16} /> {error}
            </div>
          )}

          <button type="submit" className="btn-ink w-full justify-center disabled:opacity-60"
                  disabled={loading || lockSeconds > 0}
                  data-testid="admin-login-submit">
            {loading ? (<><Loader2 className="animate-spin" size={14} /> Signing in…</>) :
             lockSeconds > 0 ? (<>Locked · {lockSeconds}s</>) : (<>Sign in</>)}
          </button>
        </form>
      </div>
    </div>
  );
}
