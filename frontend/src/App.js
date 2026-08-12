import React from "react";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { Toaster } from "sonner";
import "@/App.css";

import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PrivateRoute from "@/components/PrivateRoute";
import ScrollToTop from "@/components/ScrollToTop";
import usePageMeta from "@/hooks/usePageMeta";

import Home from "@/pages/Home";
import Team from "@/pages/Team";
import Publications from "@/pages/Publications";
import Projects from "@/pages/Projects";
import Gallery from "@/pages/Gallery";
import Contact from "@/pages/Contact";
import AdminLogin from "@/pages/AdminLogin";
import AdminDashboard from "@/pages/AdminDashboard";

const SECRET_PATH = process.env.REACT_APP_ADMIN_SECRET_PATH || "x7k2-manage-9qp";

function PublicLayout() {
  return (
    <>
      <Navbar />
      <main>
        <Outlet />
      </main>
      <Footer />
    </>
  );
}

function NotFound() {
  usePageMeta("Page not found", "The resource you tried to reach is unavailable or has been moved.");
  return (
    <div className="max-w-3xl mx-auto px-6 py-32 text-center">
      <div className="overline mb-4">Error · 404</div>
      <h1 className="font-serif text-5xl text-[#1C2722]">This page does not exist.</h1>
      <p className="mt-4 text-[#4A5A52]">
        The resource you tried to reach is unavailable or has been moved.
      </p>
    </div>
  );
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <SettingsProvider>
          <BrowserRouter>
            <ScrollToTop />
            <Routes>
              <Route element={<PublicLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/team" element={<Team />} />
                <Route path="/publications" element={<Publications />} />
                <Route path="/projects" element={<Projects />} />
                <Route path="/gallery" element={<Gallery />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="*" element={<NotFound />} />
              </Route>

              {/* Admin (secret path + route guard) */}
              <Route path={`/${SECRET_PATH}`} element={<AdminLogin />} />
              <Route
                path={`/${SECRET_PATH}/dashboard`}
                element={
                  <PrivateRoute>
                    <AdminDashboard />
                  </PrivateRoute>
                }
              />
            </Routes>
          </BrowserRouter>

          <Toaster position="top-right" richColors closeButton />
        </SettingsProvider>
      </AuthProvider>
    </div>
  );
}

export default App;