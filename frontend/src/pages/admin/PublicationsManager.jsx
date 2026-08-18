import React, { useEffect, useMemo, useState } from "react";
import {
  Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown,
  Link as LinkIcon, FileText, X, ExternalLink, Search,
} from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl, uploadViaPresign } from "../../utils/api";

export default function PublicationsManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState(null); // { mode: 'create' | 'edit', pub? }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/publications");
      setList(data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load publications");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (pub) => {
    if (!window.confirm(`Delete "${pub.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/publications/${pub.id}`);
      toast.success("Publication deleted");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
    }
  };

  /**
   * Found by id in the full list, never by the rendered row index: the
   * renumber below rewrites the order of every publication, so running it over
   * a filtered array would quietly renumber the visible few and destroy the
   * position of everything the search had hidden.
   *
   * The arrows are disabled while a search is active for the same reason a
   * filtered swap is confusing — the neighbour being swapped with may not be on
   * screen, so the click would look like it did nothing.
   */
  const swap = async (pub, dir) => {
    const idx = list.findIndex((p) => p.id === pub.id);
    const j = idx + dir;
    if (idx === -1 || j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    const items = next.map((p, i) => ({ id: p.id, display_order: i + 1 }));
    try {
      await api.put("/admin/publications/reorder", { items });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Reorder failed");
    }
  };

  const filtering = query.trim().length > 0;

  /**
   * Matches title, authors, venue and year, plus "link"/"document" so the two
   * source kinds can be pulled apart — a bare year like "2016" is the quickest
   * way into a list this long.
   */
  const visible = useMemo(() => {
    const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length === 0) return list;
    return list.filter((p) => {
      const haystack = [
        p.title, p.authors, p.venue, p.year,
        p.file_path ? "document" : "link",
      ].filter(Boolean).join(" ").toLowerCase();
      return terms.every((term) => haystack.includes(term));
    });
  }, [list, query]);
  return (
    <div data-testid="admin-publications-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Admin · Publications</div>
          <h2 className="font-serif text-3xl text-[#1C2722] mt-1">Publications</h2>
          <p className="text-sm text-[#4A5A52] mt-2 max-w-2xl">
            Every publication must have <strong>either</strong> a public link <strong>or</strong> an uploaded document —
            never both. The admin form enforces this automatically.
          </p>
        </div>
        <button className="btn-terracotta" onClick={() => setDialog({ mode: "create" })} data-testid="admin-pub-add">
          <Plus size={14} /> Add publication
        </button>
      </div>

      {!loading && list.length > 0 && (
        <div className="flex items-center justify-between gap-4 flex-wrap mb-4">
          <label className="relative flex-1 min-w-[260px] max-w-md">
            <span className="sr-only">Search publications</span>
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7A857E] pointer-events-none" />
            <input
              type="search"
              className="field !pl-9 !pr-9"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setQuery(""); }}
              placeholder="Search title, author, venue or year…"
              data-testid="admin-pub-search"
            />
            {filtering && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[#7A857E] hover:text-[#B95438]"
                data-testid="admin-pub-search-clear"
              >
                <X size={14} />
              </button>
            )}
          </label>
          <div className="overline" data-testid="admin-pub-count">
            {filtering
              ? `${visible.length} of ${list.length} shown · reordering paused`
              : `${list.length} publications`}
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[#4A5A52] py-10"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : list.length === 0 ? (
        <div className="py-10 text-[#4A5A52]">No publications yet.</div>
      ) : (
        <div className="border hairline">
          <table className="w-full text-sm">
            <thead className="bg-[#F2EFEA] border-b hairline text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:overline [&>th]:font-mono">
                <th className="w-[70px]">Year</th>
                <th>Title</th>
                <th className="w-[100px]">Source</th>
                <th className="w-[120px]">Order</th>
                <th className="w-[220px] text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-[#4A5A52]" data-testid="admin-pub-no-matches">
                    Nothing matches “{query.trim()}”.
                  </td>
                </tr>
              )}
              {visible.map((p) => {
                const isDoc = Boolean(p.file_path);
                const href = isDoc ? fileUrl(p.file_path) : p.external_url;
                return (
                  <tr key={p.id} className="border-b hairline [&>td]:px-4 [&>td]:py-3 align-middle" data-testid={`admin-pub-row-${p.id}`}>
                    <td className="font-mono text-[#B95438]">{p.year || "—"}</td>
                    <td>
                      <div className="font-serif text-base text-[#1C2722]">{p.title}</div>
                      {(p.authors || p.venue) && (
                        <div className="text-[12px] text-[#4A5A52] mt-1">
                          {p.authors}{p.authors && p.venue ? " · " : ""}{p.venue}
                        </div>
                      )}
                    </td>
                    <td>
                      <a
                        href={href || "#"}
                        target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-[#1C2722] hover:text-[#B95438]"
                        data-testid={`admin-pub-source-${p.id}`}
                      >
                        {isDoc ? <FileText size={12} /> : <LinkIcon size={12} />}
                        {isDoc ? "Document" : "Link"}
                        <ExternalLink size={10} />
                      </a>
                    </td>
                    <td>
                      <div className="inline-flex items-center gap-1">
                        <button
                          className="border hairline p-1 hover:bg-[#F2EFEA] disabled:opacity-30 disabled:hover:bg-transparent"
                          onClick={() => swap(p, -1)} disabled={filtering}
                          title={filtering ? "Clear the search to reorder" : "Move up"}
                          aria-label="Move up" data-testid={`admin-pub-up-${p.id}`}
                        ><ArrowUp size={14} /></button>
                        <button
                          className="border hairline p-1 hover:bg-[#F2EFEA] disabled:opacity-30 disabled:hover:bg-transparent"
                          onClick={() => swap(p, 1)} disabled={filtering}
                          title={filtering ? "Clear the search to reorder" : "Move down"}
                          aria-label="Move down" data-testid={`admin-pub-down-${p.id}`}
                        ><ArrowDown size={14} /></button>
                        <span className="font-mono text-[11px] text-[#7A857E] ml-2">{p.display_order}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <button className="btn-outline !py-1.5 !px-3" onClick={() => setDialog({ mode: "edit", pub: p })} data-testid={`admin-pub-edit-${p.id}`}>
                          <Pencil size={12} /> Edit
                        </button>
                        <button className="btn-outline !py-1.5 !px-3" style={{ borderColor: "#B95438", color: "#B95438" }} onClick={() => onDelete(p)} data-testid={`admin-pub-delete-${p.id}`}>
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <PublicationDialog
          initial={dialog.pub}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load(); }}
        />
      )}
    </div>
  );
}

function PublicationDialog({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);

  // Source mode is mutually exclusive: "link" or "document"
  const initialMode = isEdit && initial.file_path ? "document" : "link";
  const [mode, setMode] = useState(initialMode);

  const [title, setTitle] = useState(initial?.title || "");
  const [authors, setAuthors] = useState(initial?.authors || "");
  const [venue, setVenue] = useState(initial?.venue || "");
  const [year, setYear] = useState(initial?.year || "");
  const [abstract, setAbstract] = useState(initial?.abstract || "");
  const [url, setUrl] = useState(initial?.external_url || "");
  const [file, setFile] = useState(null);
  const [existingFileName] = useState(
    initial?.file_path ? initial.file_path.split("/").pop() : ""
  );
  const [saving, setSaving] = useState(false);

  const onPickFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
  };

  const switchTo = (m) => {
    setMode(m);
    if (m === "link") {
      setFile(null);
      const input = document.getElementById("admin-pub-file-input");
      if (input) input.value = "";
    } else {
      setUrl("");
    }
  };

const onSubmit = async (e) => {
  e.preventDefault();
  if (!title.trim()) { toast.error("Title is required"); return; }
  if (mode === "link" && !url.trim()) { toast.error("Please provide a link"); return; }
  if (mode === "document" && !file && !isEdit) { toast.error("Please upload a document"); return; }
  if (mode === "document" && !file && isEdit && !initial.file_path) { toast.error("Please upload a document"); return; }

  setSaving(true);
  try {
    const payload = {
      title: title.trim(), authors: authors || "",
      venue: venue || "", abstract: abstract || "",
    };
    if (year !== "") payload.year = Number(year);

    if (mode === "link") {
      payload.external_url = url.trim();
      payload.file_path = "";
    } else {
      let file_path = isEdit ? (initial.file_path || "") : "";
      if (file) file_path = await uploadViaPresign(file, "publications");
      payload.file_path = file_path;
      payload.external_url = "";
    }

    if (isEdit) {
      await api.put(`/admin/publications/${initial.id}`, payload);
      toast.success("Publication updated");
    } else {
      await api.post("/admin/publications", payload);
      toast.success("Publication added");
    }
    onSaved?.();
  } catch (err) {
    toast.error(err?.response?.data?.detail || "Save failed");
  } finally { setSaving(false); }
};
  return (
    <div
      className="fixed inset-0 z-50 bg-[#1C2722]/60 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="admin-pub-dialog"
    >
      <div className="bg-[#F9F8F6] border hairline w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 bg-[#F9F8F6]">
          <div>
            <div className="overline">{isEdit ? "Edit" : "New"}</div>
            <h3 className="font-serif text-2xl text-[#1C2722]">{isEdit ? "Edit publication" : "Add publication"}</h3>
          </div>
          <button onClick={onClose} className="p-2 border hairline" aria-label="Close"><X size={16} /></button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <label className="block">
            <span className="overline block mb-2">Title</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="admin-pub-title-input" required />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-5">
            <label className="block">
              <span className="overline block mb-2">Authors</span>
              <input className="field" value={authors} onChange={(e) => setAuthors(e.target.value)} placeholder="A. Okonkwo, K. Mensah" data-testid="admin-pub-authors-input" />
            </label>
            <label className="block">
              <span className="overline block mb-2">Year</span>
              <input
                type="number" className="field" value={year}
                onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                min="1900" max="2100"
                data-testid="admin-pub-year-input"
              />
            </label>
          </div>

          <label className="block">
            <span className="overline block mb-2">Venue (journal / conference)</span>
            <input className="field" value={venue} onChange={(e) => setVenue(e.target.value)} placeholder="Nature Sustainability" data-testid="admin-pub-venue-input" />
          </label>

          <label className="block">
            <span className="overline block mb-2">Abstract / short description</span>
            <textarea rows={4} className="field" value={abstract} onChange={(e) => setAbstract(e.target.value)} data-testid="admin-pub-abstract-input" />
          </label>

          {/* Source selector */}
          <div className="border hairline">
            <div className="grid grid-cols-2 border-b hairline">
              <button
                type="button"
                onClick={() => switchTo("link")}
                className={`px-4 py-3 text-[11px] font-mono tracking-widest uppercase flex items-center justify-center gap-2 ${mode === "link" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                data-testid="admin-pub-mode-link"
              >
                <LinkIcon size={12} /> Use a link
              </button>
              <button
                type="button"
                onClick={() => switchTo("document")}
                className={`px-4 py-3 text-[11px] font-mono tracking-widest uppercase flex items-center justify-center gap-2 ${mode === "document" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
                data-testid="admin-pub-mode-document"
              >
                <FileText size={12} /> Upload a document
              </button>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Link input */}
              <label className={`block ${mode !== "link" ? "opacity-40" : ""}`}>
                <span className="overline block mb-2">Link URL</span>
                <input
                  type="url"
                  className="field"
                  value={mode === "link" ? url : ""}
                  onChange={(e) => setUrl(e.target.value)}
                  disabled={mode !== "link"}
                  placeholder="https://doi.org/…"
                  data-testid="admin-pub-link-input"
                />
                {mode !== "link" && (
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#7A857E] mt-1 block">
                    Disabled — document source is selected
                  </span>
                )}
              </label>

              {/* File input */}
              <label className={`block ${mode !== "document" ? "opacity-40" : ""}`}>
                <span className="overline block mb-2">Document (pdf, doc, docx, txt, md…)</span>
                <div className="flex items-center gap-2">
                  <label className={`inline-flex items-center gap-2 border hairline px-3 py-2 text-[12px] font-mono tracking-widest uppercase ${mode === "document" ? "cursor-pointer hover:bg-[#E6E4DD] text-[#1C2722]" : "text-[#7A857E] cursor-not-allowed"}`}>
                    <FileText size={12} />
                    {file ? "Change file" : (isEdit && initial?.file_path ? "Replace file" : "Choose file")}
                    <input
                      id="admin-pub-file-input"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt,.md,.rtf,.odt,application/pdf"
                      onChange={onPickFile}
                      disabled={mode !== "document"}
                      data-testid="admin-pub-file-input"
                    />
                  </label>
                  {file && (
                    <span className="text-[11px] font-mono text-[#1C2722] truncate max-w-[220px]" title={file.name}>
                      {file.name} · {(file.size / (1024 * 1024)).toFixed(2)}MB
                    </span>
                  )}
                  {!file && isEdit && initial?.file_path && mode === "document" && (
                    <span className="text-[11px] font-mono text-[#4A5A52] truncate max-w-[220px]" title={existingFileName}>
                      Current: {existingFileName}
                    </span>
                  )}
                </div>
                {mode !== "document" && (
                  <span className="text-[11px] font-mono uppercase tracking-widest text-[#7A857E] mt-1 block">
                    Disabled — link source is selected
                  </span>
                )}
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-terracotta disabled:opacity-60" disabled={saving} data-testid="admin-pub-save">
              {saving ? (<><Loader2 className="animate-spin" size={14} /> Saving</>) : (isEdit ? "Save changes" : "Create publication")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
