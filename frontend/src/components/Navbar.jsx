import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const LINKS = [
  { to: "/", label: "Introduction" },
  { to: "/team", label: "Team" },
  { to: "/projects", label: "Projects" },
  { to: "/publications", label: "Publications" },
  { to: "/contact", label: "Contact" },
];

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { settings } = useSettings();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-xl transition-colors border-b hairline ${scrolled ? "bg-[#F9F8F6]/90" : "bg-[#F9F8F6]/70"}`}
      data-testid="site-navbar"
    >
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-[64px] sm:h-[72px] gap-3">
          {/* Logo + wordmark (shrinks/truncates on small screens) */}
          <Link to="/" className="flex items-center gap-3 md:gap-4 group min-w-0" data-testid="logo-link">
            <img
              src="/iwm-logo.png"
              alt="Innovative Waste Management"
              className="h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 object-contain shrink-0"
            />
            <span className="font-serif text-base sm:text-lg md:text-xl tracking-tight text-[#1C2722] group-hover:text-[#B95438] transition-colors truncate">
              {settings.org_name || "Innovative Waste Management"}
            </span>
          </Link>

          {/* Desktop nav — animated draw-in underline */}
          <nav className="hidden md:flex items-center gap-2 shrink-0">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                data-testid={`nav-link-${l.label.toLowerCase()}`}
                className="group relative px-3 py-2"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`text-[15px] tracking-wide transition-colors duration-300 ${
                        isActive ? "text-[#B95438]" : "text-[#1C2722] group-hover:text-[#B95438]"
                      }`}
                    >
                      {l.label}
                    </span>
                    <span
                      className={`pointer-events-none absolute left-3 right-3 bottom-1 h-[2px] bg-[#B95438] origin-left transition-transform duration-300 ease-out ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <Link to="/contact" className="hidden md:inline-flex btn-outline shrink-0" data-testid="nav-cta-contact">
            Contact
          </Link>

          {/* Mobile toggle */}
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            className="md:hidden p-2 border hairline shrink-0 transition-colors hover:bg-[#F2EFEA]"
            onClick={() => setOpen((v) => !v)}
            data-testid="mobile-menu-toggle"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden border-t hairline bg-[#F9F8F6]" data-testid="mobile-menu">
          <div className="px-4 sm:px-6 py-4 flex flex-col">
            {LINKS.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === "/"}
                onClick={() => setOpen(false)}
                data-testid={`mobile-nav-${l.label.toLowerCase()}`}
                className={({ isActive }) =>
                  `group relative py-3 px-3 border-b hairline font-serif text-xl transition-colors ${
                    isActive ? "text-[#B95438]" : "text-[#1C2722]"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {l.label}
                    <span
                      className={`pointer-events-none absolute left-3 bottom-2 h-[2px] bg-[#B95438] origin-left transition-transform duration-300 ease-out w-8 ${
                        isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;