/**
 * The public gallery page — currently NOT routed.
 *
 * The gallery was taken off the website at the lab's request; the figures in it
 * are still very much in use, as the pool project stories pick from, so nothing
 * about the collection or the admin tab changed. Only this page, its navbar and
 * footer links, and the home-page buttons pointing at it were withdrawn.
 *
 * To put it back: re-add the import and `<Route path="/gallery" …>` in App.js,
 * the entry in Navbar's LINKS, and the footer list item. Everything below still
 * works as it did, including the "From the project …" cross-links.
 */
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import { Loader2, AlertTriangle, ArrowRight } from "lucide-react";
import { api } from "../utils/api";
import { storyGalleryIds } from "../lib/projectStory";
import GalleryItemView from "../components/GalleryItem";
import Lightbox from "../components/Lightbox";
import usePageMeta from "../hooks/usePageMeta";

export default function GalleryPage() {
  const [items, setItems] = useState([]);
  const [projects, setProjects] = useState([]);
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
        // Projects are only here to tell a figure which story it belongs to, so
        // a failure there must not take the gallery down with it.
        const [gal, proj] = await Promise.all([
          api.get("/gallery"),
          api.get("/projects").catch(() => ({ data: [] })),
        ]);
        if (!cancelled) {
          setItems(gal.data || []);
          setProjects(proj.data || []);
        }
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || "Failed to load gallery.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /**
   * Which project story, if any, cites each figure. Built from the stories
   * themselves rather than a field on the gallery item, so picking a figure in
   * the story editor is the only place the connection has to be made.
   */
  const projectByItemId = useMemo(() => {
    const map = {};
    for (const p of projects) {
      for (const gid of storyGalleryIds(p)) {
        if (!map[gid]) map[gid] = p;
      }
    }
    return map;
  }, [projects]);

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
              {items.map((it, i) => {
                const project = projectByItemId[String(it.id)];
                return (
                  <div
                    key={it.id}
                    className="break-inside-avoid mb-5 fade-up"
                    style={{ animationDelay: `${Math.min(i, 10) * 50}ms` }}
                  >
                    <GalleryItemView item={it} onOpen={() => open(i)} />
                    {/* Outside the figure on purpose — the figure is itself a
                        button into the lightbox, and a link nested inside one is
                        ambiguous to both the keyboard and a screen reader. */}
                    {project && (
                      <Link
                        to={`/projects/${project.id}`}
                        className="group flex items-center justify-between gap-3 border border-t-0 hairline px-4 py-2.5 bg-[#F9F8F6] hover:bg-[#F2EFEA] transition-colors"
                        data-testid={`gallery-project-link-${it.id}`}
                      >
                        <span className="min-w-0">
                          <span className="overline block">From the project</span>
                          <span className="block text-[13px] text-[#1C2722] truncate group-hover:text-[#B95438] transition-colors">
                            {project.title}
                          </span>
                        </span>
                        <ArrowRight size={13} className="shrink-0 text-[#7A857E] group-hover:text-[#B95438] transition-colors" />
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {lightboxIdx != null && (
  <Lightbox items={items} index={lightboxIdx} onClose={close} onPrev={prev} onNext={next} />
)}
    </div>
  );
}
