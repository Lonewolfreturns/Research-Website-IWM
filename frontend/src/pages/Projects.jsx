import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { api } from "../utils/api";
import ProjectCard from "../components/ProjectCard";
import ContactSection from "../components/ContactSection";
import usePageMeta from "../hooks/usePageMeta";
import Pagination from "../components/Pagination";

const PER_PAGE = 6;

export default function ProjectsPage() {
  const [items, setItems] = useState([]);
  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = useRef(null);
  usePageMeta(
    "Projects",
    "Current and recent projects from the Innovative Waste Management lab — what is being done, who is involved, and who funds the work."
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // The roster is only needed to turn names in the credits into links, so
        // a failure there must not take the projects down with it.
        const [projects, team] = await Promise.all([
          api.get("/projects"),
          api.get("/team").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        setItems(projects.data || []);
        setRoster(team.data || []);
      } catch (e) {
        // A 404 means the projects endpoint isn't live yet (the Lambda still
        // needs deploying). To a visitor that is indistinguishable from "nothing
        // published", so show the empty state rather than a raw "not found".
        if (cancelled) return;
        if (e?.response?.status === 404) setItems([]);
        else setError(e?.response?.data?.detail || "Failed to load projects.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  const page = Math.min(Math.max(parseInt(searchParams.get("page"), 10) || 1, 1), totalPages);
  const visible = useMemo(
    () => items.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [items, page]
  );

  const goToPage = (n) => {
    const next = Math.min(Math.max(n, 1), totalPages);
    setSearchParams(next === 1 ? {} : { page: String(next) });
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div data-testid="projects-page">
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="overline mb-4">§ Register · Projects</div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.98] text-[#1C2722] tracking-tight">
              What the lab is working on <em className="not-italic text-[#B95438]">right now</em>.
            </h1>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-[#4A5A52] max-w-md">
              Each entry sets out what is being done, who is doing it, which partners are involved,
              and who funds and sponsors the work. We list the money alongside the science because
              both belong in the record.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
          {loading && (
            <div className="flex items-center gap-3 py-20 text-[#4A5A52]" data-testid="projects-loading">
              <Loader2 className="animate-spin" size={18} /> Loading projects…
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center gap-3 py-20 text-[#96402A]" data-testid="projects-error">
              <AlertTriangle size={18} /> {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="py-20 text-[#4A5A52]" data-testid="projects-empty">
              No projects listed yet — please check back soon.
            </div>
          )}
          {!loading && !error && items.length > 0 && (
            <>
              {totalPages > 1 && (
                <div
                  className="flex items-baseline justify-between gap-4 flex-wrap mb-8"
                  ref={listRef}
                  style={{ scrollMarginTop: "7rem" }}
                >
                  <div className="overline" data-testid="projects-count">
                    Showing {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, items.length)} of {items.length}
                  </div>
                  <div className="font-mono text-[11px] tracking-widest uppercase text-[#7A857E]">
                    Page {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-6 lg:gap-8" data-testid="projects-list">
                {visible.map((p, i) => (
                  <ProjectCard key={p.id} project={p} index={(page - 1) * PER_PAGE + i} roster={roster} />
                ))}
              </div>
              <Pagination page={page} totalPages={totalPages} onChange={goToPage}
                          testIdPrefix="projects" label="Project pages" />
            </>
          )}
        </div>
      </section>

      <ContactSection testIdPrefix="projects-contact" />
    </div>
  );
}
