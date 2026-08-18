import React from "react";
import { Link } from "react-router-dom";
import { useSettings } from "../context/SettingsContext";

export const Footer = () => {
  const year = new Date().getFullYear();
  const { settings } = useSettings();
  const s = settings;
  const cityRegion = [s.city, s.region].filter(Boolean).join(", ");
  const postal = [s.postal_code, s.country].filter(Boolean).join(" · ");
  return (
    <footer className="border-t hairline bg-[#F2EFEA] mt-24" data-testid="site-footer">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
        <div className="md:col-span-5">
          <div className="overline mb-4">The Lab</div>
          <h3 className="font-serif text-3xl leading-tight text-[#1C2722] max-w-md">
            {s.org_name} — researching the systems that turn waste into resource.
          </h3>
          {s.tagline && <p className="mt-6 text-sm text-[#4A5A52] max-w-md">{s.tagline}</p>}
          {s.affiliation && (
            <div className="mt-6 inline-flex items-center gap-2 border hairline px-3 py-2 bg-[#F9F8F6]">
              <span className="w-2 h-2 bg-[#B95438]" />
              <span className="text-[12px] font-mono tracking-widest uppercase text-[#1C2722]">{s.affiliation}</span>
            </div>
          )}
        </div>
        <div className="md:col-span-3">
          <div className="overline mb-4">Navigate</div>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="ink-link">Introduction</Link></li>
            <li><Link to="/team" className="ink-link">Team</Link></li>
            <li><Link to="/projects" className="ink-link">Projects</Link></li>
            <li><Link to="/publications" className="ink-link">Publications</Link></li>
            <li><Link to="/contact" className="ink-link">Contact</Link></li>
          </ul>
        </div>
        <div className="md:col-span-4">
          <div className="overline mb-4">Correspondence</div>
          <address className="not-italic text-sm text-[#1C2722] leading-relaxed" data-testid="footer-address">
            {s.org_name}{s.org_name && <br />}
            {s.address_line1}{s.address_line1 && <br />}
            {s.address_line2}{s.address_line2 && <br />}
            {cityRegion && <>{cityRegion}<br /></>}
            {postal}
          </address>
          <div className="mt-4 text-sm">
            {s.email && <div><span className="text-[#4A5A52]">E ·</span>&nbsp;<span className="select-all" data-testid="footer-email">{s.email}</span></div>}
            {s.phone && <div><span className="text-[#4A5A52]">T ·</span>&nbsp;<span data-testid="footer-phone">{s.phone}</span></div>}
          </div>
        </div>
      </div>
      <div className="border-t hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-[11px] font-mono tracking-widest uppercase text-[#4A5A52]">
          <div>© {year} · {s.org_name || "IWM Lab"} · All rights reserved</div>
          <div>{[s.city, s.country].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
