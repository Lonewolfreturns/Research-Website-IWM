import React from "react";
import ContactForm from "./ContactForm";
import { useSettings } from "../context/SettingsContext";

// Reusable contact section that sits at the bottom of every public page.
export const ContactSection = ({ testIdPrefix = "page-contact" }) => {
  const { settings: s } = useSettings();
  const cityRegion = [s.city, s.region].filter(Boolean).join(", ");
  const postal = [s.postal_code, s.country].filter(Boolean).join(" · ");
  return (
    <section
      id="contact-section"
      className="border-t hairline bg-[#F9F8F6]"
      data-testid="contact-section"
    >
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-5">
          <div className="overline mb-4">Correspondence</div>
          <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] text-[#1C2722] tracking-tight">
            Get in touch with the lab.
          </h2>
          <p className="mt-5 text-[15px] text-[#4A5A52] max-w-lg">
            Whether you&apos;re a policy maker, an industry collaborator, or a prospective
            researcher — we read every message. Use the form, or write to us directly.
          </p>

          <div className="mt-8 border hairline">
            <div className="grid grid-cols-2">
              <div className="p-5 border-r hairline">
                <div className="overline mb-2">Email</div>
                {s.email ? (
                  <span className="font-serif text-lg select-all">{s.email}</span>
                ) : <span className="text-sm text-[#7A857E]">—</span>}
              </div>
              <div className="p-5">
                <div className="overline mb-2">Phone</div>
                <div className="font-serif text-lg">{s.phone || "—"}</div>
              </div>
            </div>
            <div className="p-5 border-t hairline">
              <div className="overline mb-2">Visit</div>
              <div className="font-serif text-lg leading-relaxed">
                {s.address_line1}{s.address_line1 && <br />}
                {s.address_line2}{s.address_line2 && <br />}
                {cityRegion && <>{cityRegion}<br /></>}
                {postal}
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7">
          <ContactForm variant="full" testIdPrefix={testIdPrefix} />
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
