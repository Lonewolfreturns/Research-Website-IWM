import React, { useEffect, useState, useCallback } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "../utils/api";
import GalleryItemView from "../components/GalleryItem";
import Lightbox from "../components/Lightbox";
import ContactSection from "../components/ContactSection";
import usePageMeta from "../hooks/usePageMeta";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState(null);
  usePageMeta(
    "Gallery",
    "A visual record of the experiments, facilities and people behind the lab's published research."
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/gallery");
        if (!cancelled) setItems(data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || "Failed to load gallery.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const open = useCallback((i) => setLightboxIdx(i), []);
  const close = useCallback(() => setLightboxIdx(null), []);
  const prev = useCallback(() => setLightboxIdx((i) => (i == null ? null : (i - 1 + items.length) % items.length)), [items.length]);
  const next = useCallback(() => setLightboxIdx((i) => (i == null ? null : (i + 1) % items.length)), [items.length]);

  return (
    <div data-testid="gallery-page">
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="overline mb-4">§ Archive · Gallery</div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.98] text-[#1C2722] tracking-tight">
              Field notes, figures and footage from the lab.
            </h1>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-[#4A5A52] max-w-md">
              A visual record of the experiments, facilities and people behind our published
              research. Click any figure to enlarge.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16">
          {loading && (
            <div className="flex items-center gap-3 py-20 text-[#4A5A52]" data-testid="gallery-loading">
              <Loader2 className="animate-spin" size={18} /> Loading gallery…
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center gap-3 py-20 text-[#96402A]" data-testid="gallery-error">
              <AlertTriangle size={18} /> {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="py-20 text-[#4A5A52]" data-testid="gallery-empty">
              The gallery is empty — please check back soon.
            </div>
          )}
          {!loading && !error && items.length > 0 && (
           <div className="columns-1 sm:columns-2 lg:columns-3 gap-5" data-testid="gallery-masonry">
  {items.map((it, i) => (
    <div key={it.id} className="break-inside-avoid mb-5 fade-up" style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}>
      <GalleryItemView item={it} onOpen={() => open(i)} />
    </div>
  ))}
</div>
          )}
        </div>
      </section>

      {lightboxIdx != null && (
  <Lightbox items={items} index={lightboxIdx} onClose={close} onPrev={prev} onNext={next} />
)}
      <ContactSection testIdPrefix="gallery-contact" />
    </div>
  );
}
