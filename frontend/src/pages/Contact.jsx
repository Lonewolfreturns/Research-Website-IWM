import React from "react";
import { Mail, Phone, MapPin, Clock, Building } from "lucide-react";
import ContactForm from "../components/ContactForm";
import { useSettings } from "../context/SettingsContext";
import usePageMeta from "../hooks/usePageMeta";

export default function ContactPage() {
  const { settings: s } = useSettings();
  usePageMeta(
    "Contact",
    "Collaborations, press enquiries, open-data requests and research proposals — write to the Innovative Waste Management lab."
  );
  const cityRegion = [s.city, s.region].filter(Boolean).join(", ");
  const postal = [s.postal_code, s.country].filter(Boolean).join(" · ");
  return (
    <div data-testid="contact-page">
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="overline mb-4">§ Correspondence · Contact</div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.98] text-[#1C2722] tracking-tight">
              Contact the lab.
            </h1>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-[#4A5A52] max-w-md">
              Collaborations, press enquiries, open-data requests, and research proposals — all of
              them land in the same inbox, and all of them get read.
            </p>
            {[s.city, s.country].filter(Boolean).length > 0 && (
              <div className="mt-4 inline-flex items-center gap-2 border hairline px-3 py-2 bg-[#F2EFEA]">
                <span className="w-2 h-2 bg-[#B95438]" />
                <span className="text-[11px] font-mono tracking-widest uppercase text-[#1C2722]" data-testid="contact-location-badge">
                  Based in {[s.city, s.region, s.country].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <aside className="lg:col-span-4 space-y-8">
            {s.email && (
              <div>
                <div className="overline mb-3">Email</div>
                {/* Plain text, not a mailto: link — writing to the lab goes through
                    the form below, which posts to our own server. */}
                <div className="font-serif text-2xl inline-flex items-center gap-2" data-testid="contact-email">
                  <Mail size={18} /> <span className="select-all">{s.email}</span>
                </div>
              </div>
            )}
            {s.phone && (
              <div>
                <div className="overline mb-3">Phone</div>
                <div className="font-serif text-2xl inline-flex items-center gap-2" data-testid="contact-phone"><Phone size={18} /> {s.phone}</div>
              </div>
            )}
            <div>
              <div className="overline mb-3">Visit</div>
              <div className="font-serif text-xl leading-relaxed inline-flex items-start gap-2" data-testid="contact-address">
                <MapPin size={18} className="mt-1 shrink-0" />
                <span>
                  {s.org_name}<br />
                  {s.address_line1}{s.address_line1 && <br />}
                  {s.address_line2}{s.address_line2 && <br />}
                  {cityRegion && <>{cityRegion}<br /></>}
                  {postal}
                </span>
              </div>
            </div>
            {s.office_hours && (
              <div className="border hairline p-5 bg-[#F2EFEA]">
                <div className="overline mb-2 inline-flex items-center gap-2"><Clock size={11} /> Office hours</div>
                <div className="font-serif text-lg leading-relaxed">{s.office_hours}</div>
              </div>
            )}
            {s.affiliation && (
              <div className="border hairline p-5 bg-[#F9F8F6]">
                <div className="overline mb-2 inline-flex items-center gap-2"><Building size={11} /> Affiliation</div>
                <div className="font-serif text-lg leading-relaxed">{s.affiliation}</div>
              </div>
            )}
          </aside>

          <div className="lg:col-span-8 border hairline p-6 md:p-10 bg-[#F9F8F6]">
            <ContactForm variant="full" testIdPrefix="contactpage" />
          </div>
        </div>
      </section>
    </div>
  );
}
