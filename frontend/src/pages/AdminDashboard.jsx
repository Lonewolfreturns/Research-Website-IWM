import React, { useEffect, useState } from "react";
import { Users, Image as ImgIcon, LogOut, Lock, Settings, BookOpen, FlaskConical } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import TeamManager from "./admin/TeamManager";
import GalleryManager from "./admin/GalleryManager";
import SettingsManager from "./admin/SettingsManager";
import PublicationsManager from "./admin/PublicationsManager";
import ProjectsManager from "./admin/ProjectsManager";

const SECRET_PATH = process.env.REACT_APP_ADMIN_SECRET_PATH || "x7k2-manage-9qp";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState("team");

  useEffect(() => {
    document.title = "IWM · Admin";
    const m = document.createElement("meta");
    m.name = "robots";
    m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { document.head.removeChild(m); };
  }, []);

  const onLogout = async () => {
    await logout();
    nav(`/${SECRET_PATH}`, { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F9F8F6]" data-testid="admin-dashboard">
      <header className="border-b hairline bg-[#F2EFEA]">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock size={14} className="text-[#B95438]" />
            <div>
              <div className="overline">Admin console</div>
              <div className="font-serif text-xl text-[#1C2722]">IWM Research — CMS</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex border hairline">
              <button
                className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2 ${tab === "team" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                onClick={() => setTab("team")} data-testid="admin-tab-team"
              >
                <Users size={12} /> Team
              </button>
              <button
                className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2 ${tab === "projects" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                onClick={() => setTab("projects")} data-testid="admin-tab-projects"
              >
                <FlaskConical size={12} /> Projects
              </button>
              <button
                className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2 ${tab === "publications" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                onClick={() => setTab("publications")} data-testid="admin-tab-publications"
              >
                <BookOpen size={12} /> Publications
              </button>
              <button
                className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2 ${tab === "gallery" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                onClick={() => setTab("gallery")} data-testid="admin-tab-gallery"
              >
                <ImgIcon size={12} /> Gallery
              </button>
              <button
                className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase flex items-center gap-2 ${tab === "settings" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                onClick={() => setTab("settings")} data-testid="admin-tab-settings"
              >
                <Settings size={12} /> Site
              </button>
            </div>
            <button onClick={onLogout} className="btn-outline !py-2 !px-3" data-testid="admin-logout"><LogOut size={12} /> Sign out</button>
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10">
        {tab === "team" && <TeamManager />}
        {tab === "projects" && <ProjectsManager />}
        {tab === "publications" && <PublicationsManager />}
        {tab === "gallery" && <GalleryManager />}
        {tab === "settings" && <SettingsManager />}
      </main>
    </div>
  );
}
