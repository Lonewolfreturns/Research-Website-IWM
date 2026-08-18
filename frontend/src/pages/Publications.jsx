import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, AlertTriangle, ExternalLink, FileText, ArrowUpRight } from "lucide-react";
import { api, fileUrl } from "../utils/api";
import usePageMeta from "../hooks/usePageMeta";
import Pagination from "../components/Pagination";

const PER_PAGE = 10;

function resolveLink(pub) {
  if (pub.external_url) return { href: pub.external_url, kind: "link" };
  if (pub.file_path) return { href: fileUrl(pub.file_path), kind: "document" };
  return null;
}

export default function PublicationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchParams, setSearchParams] = useSearchParams();
  const listRef = useRef(null);
  usePageMeta(
    "Publications",
    "A curated index of the lab's peer-reviewed papers, working papers, reports and open datasets."
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/publications");
        if (!cancelled) setItems(data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || "Failed to load publications.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const totalPages = Math.max(1, Math.ceil(items.length / PER_PAGE));
  // The page lives in the URL so a particular page can be linked and the back
  // button works. Clamped on read, so ?page=99 or a hand-edited URL can't render
  // an empty list.
  const page = Math.min(Math.max(parseInt(searchParams.get("page"), 10) || 1, 1), totalPages);
  const visible = useMemo(
    () => items.slice((page - 1) * PER_PAGE, page * PER_PAGE),
    [items, page]
  );

  const goToPage = (n) => {
    const next = Math.min(Math.max(n, 1), totalPages);
    setSearchParams(next === 1 ? {} : { page: String(next) });
    // Paging keeps the same route, so ScrollToTop doesn't fire — bring the top
    // of the list back into view rather than leaving the reader mid-page.
    listRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const firstOnPage = (page - 1) * PER_PAGE + 1;
  const lastOnPage = Math.min(page * PER_PAGE, items.length);

  return (
    <div data-testid="publications-page">
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8">
            <div className="overline mb-4">§ Index · Publications</div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.98] text-[#1C2722] tracking-tight">
              Papers, reports and datasets from the lab.
            </h1>
          </div>
          <div className="lg:col-span-4">
            <p className="text-[15px] leading-relaxed text-[#4A5A52] max-w-md">
              A curated index of the lab&apos;s peer-reviewed work, working papers and open
              datasets. Every entry links to a full-text source — either a journal record or a
              PDF you can open directly.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
          {loading && (
            <div className="flex items-center gap-3 py-20 text-[#4A5A52]" data-testid="publications-loading">
              <Loader2 className="animate-spin" size={18} /> Loading publications…
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center gap-3 py-20 text-[#96402A]" data-testid="publications-error">
              <AlertTriangle size={18} /> {error}
            </div>
          )}
          {!loading && !error && items.length === 0 && (
            <div className="py-20 text-[#4A5A52]" data-testid="publications-empty">
              No publications listed yet. Please check back soon.
            </div>
          )}
          {!loading && !error && items.length > 0 && (
            <>
              <div
                className="flex items-baseline justify-between gap-4 flex-wrap mb-6"
                ref={listRef}
                style={{ scrollMarginTop: "7rem" }}
              >
                <div className="overline" data-testid="publications-count">
                  Showing {firstOnPage}–{lastOnPage} of {items.length}
                </div>
                {totalPages > 1 && (
                  <div className="font-mono text-[11px] tracking-widest uppercase text-[#7A857E]">
                    Page {String(page).padStart(2, "0")} / {String(totalPages).padStart(2, "0")}
                  </div>
                )}
              </div>
            <ol className="border-t hairline hairline-y" data-testid="publications-list">
              {visible.map((pub, i) => {
                const link = resolveLink(pub);
                const Kind = link?.kind === "document" ? FileText : ExternalLink;
                return (
                  <li key={pub.id} className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-8 group fade-up" style={{ animationDelay: `${Math.min(i, 10) * 40}ms` }} data-testid={`publication-${pub.id}`}>
                    <div className="lg:col-span-2 flex items-start gap-3">
                      <span className="font-mono text-[11px] tracking-widest uppercase text-[#B95438]" data-testid={`publication-year-${pub.id}`}>
                        {pub.year || "—"}
                      </span>
                      {pub.venue && (
                        <span className="text-[11px] font-mono tracking-widest uppercase text-[#7A857E] line-clamp-2">{pub.venue}</span>
                      )}
                    </div>
                    <div className="lg:col-span-8">
                      <h3 className="font-serif text-2xl md:text-[28px] leading-snug text-[#1C2722] group-hover:text-[#B95438] transition-colors" data-testid={`publication-title-${pub.id}`}>
                        {pub.title}
                      </h3>
                      {pub.authors && (
                        <div className="mt-2 text-[13.5px] italic text-[#4A5A52]" data-testid={`publication-authors-${pub.id}`}>{pub.authors}</div>
                      )}
                      {pub.abstract && (
                        <p className="mt-3 text-[14.5px] leading-relaxed text-[#4A5A52] max-w-3xl" data-testid={`publication-abstract-${pub.id}`}>
                          {pub.abstract}
                        </p>
                      )}
                    </div>
                    <div className="lg:col-span-2 flex lg:justify-end items-start">
                      {link ? (
                        <a
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-outline !py-2 !px-3 whitespace-nowrap"
                          data-testid={`publication-learnmore-${pub.id}`}
                          data-kind={link.kind}
                        >
                          <Kind size={12} />
                          {link.kind === "document" ? "Open PDF" : "Learn more"}
                          <ArrowUpRight size={12} />
                        </a>
                      ) : (
                        <span className="text-[11px] font-mono tracking-widest uppercase text-[#7A857E]">Coming soon</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
            <Pagination page={page} totalPages={totalPages} onChange={goToPage}
                        testIdPrefix="publications" label="Publications pages" />
            </>
          )}
        </div>
      </section>
    </div>
  );
}
