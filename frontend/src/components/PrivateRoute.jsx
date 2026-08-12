import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Loader2 } from "lucide-react";

const SECRET_PATH = process.env.REACT_APP_ADMIN_SECRET_PATH || "x7k2-manage-9qp";

export default function PrivateRoute({ children }) {
  const { authed, checking } = useAuth();

  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[#4A5A52]">
        <Loader2 className="animate-spin mr-2" size={18} /> Verifying session…
      </div>
    );
  }
  if (!authed) return <Navigate to={`/${SECRET_PATH}`} replace />;
  return children;
}
