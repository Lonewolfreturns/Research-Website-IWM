import React, { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Link as LinkIcon, UploadCloud, X, Check, Play } from "lucide-react";
import { api, fileUrl, uploadViaPresign } from "../../utils/api";
import { toast } from "sonner";

export default function GalleryManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("upload"); // upload | embed
  const [captions, setCaptions] = useState({}); // id -> edited caption
  const [savingCaption, setSavingCaption] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/gallery");
      setItems(data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load gallery");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (id) => {
    if (!window.confirm("Delete this gallery item?")) return;
    try {
      await api.delete(`/admin/gallery/${id}`);
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
    }
  };

  const saveCaption = async (id) => {
    setSavingCaption((s) => ({ ...s, [id]: true }));
    try {
      await api.put(`/admin/gallery/${id}`, { caption: captions[id] || "" });
      toast.success("Caption saved");
      setCaptions((c) => { const n = { ...c }; delete n[id]; return n; });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to save caption");
    } finally {
      setSavingCaption((s) => ({ ...s, [id]: false }));
    }
  };

  return (
    <div data-testid="admin-gallery-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Admin · Gallery</div>
          <h2 className="font-serif text-3xl text-[#1C2722] mt-1">Gallery items</h2>
          <p className="text-sm text-[#4A5A52] mt-2 max-w-2xl">
            There is no public gallery page at the moment. These figures are the pool a
            project story picks from — add them here, then choose them in
            <strong> Projects → Edit → The story → From the gallery</strong>. Anything not
            picked by a story simply isn&apos;t shown on the site.
          </p>
        </div>
        <div className="inline-flex border hairline bg-[#F9F8F6]">
          <button
            className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase ${mode === "upload" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
            onClick={() => setMode("upload")} data-testid="admin-gallery-tab-upload"
          >
            <UploadCloud size={12} className="inline mr-2" /> Upload file
          </button>
          <button
            className={`px-4 py-2 text-[11px] font-mono tracking-widest uppercase ${mode === "embed" ? "bg-[#1C2722] text-[#F9F8F6]" : "text-[#1C2722]"}`}
            onClick={() => setMode("embed")} data-testid="admin-gallery-tab-embed"
          >
            <LinkIcon size={12} className="inline mr-2" /> Embed URL
          </button>
        </div>
      </div>

      {mode === "upload" ? <UploadPanel onAdded={load} /> : <EmbedPanel onAdded={load} />}

      <div className="mt-10">
        <div className="overline mb-3">Current items · {items.length}</div>
        {loading ? (
          <div className="flex items-center gap-2 text-[#4A5A52] py-10"><Loader2 className="animate-spin" size={16} /> Loading…</div>
        ) : items.length === 0 ? (
          <div className="py-10 text-[#4A5A52]">No items yet. Upload a file or add an embed above.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5" data-testid="admin-gallery-grid">
            {items.map((it) => (
              <div key={it.id} className="border hairline bg-[#F9F8F6]" data-testid={`admin-gallery-card-${it.id}`}>
                <div className="relative aspect-video bg-[#E6E4DD]">
                  {it.type === "image" && <img src={fileUrl(it.file_path)} alt="" className="w-full h-full object-cover" />}
                  {it.type === "video" && <video src={fileUrl(it.file_path)} muted className="w-full h-full object-cover" preload="metadata" />}
                  {it.type === "embed" && (
                    <div className="w-full h-full relative bg-[#1C2722]">
                      <iframe src={it.embed_url} title="" className="w-full h-full border-0 pointer-events-none" />
                      <div className="absolute inset-0 flex items-center justify-center"><Play size={28} className="text-[#F9F8F6]" /></div>
                    </div>
                  )}
                  <div className="absolute top-2 left-2 overline bg-[#F9F8F6] px-2 py-1">{it.type}</div>
                </div>
                <div className="p-3 border-t hairline">
                  <textarea
                    rows={2}
                    className="field text-sm"
                    placeholder="Caption"
                    value={captions[it.id] ?? (it.caption || "")}
                    onChange={(e) => setCaptions((c) => ({ ...c, [it.id]: e.target.value }))}
                    data-testid={`admin-gallery-caption-${it.id}`}
                  />
                  <div className="flex items-center justify-end gap-2 mt-2">
                    <button className="btn-outline !py-1 !px-3" onClick={() => saveCaption(it.id)} disabled={savingCaption[it.id]} data-testid={`admin-gallery-save-caption-${it.id}`}>
                      {savingCaption[it.id] ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Save
                    </button>
                    <button className="btn-outline !py-1 !px-3" style={{ borderColor: "#B95438", color: "#B95438" }} onClick={() => onDelete(it.id)} data-testid={`admin-gallery-delete-${it.id}`}>
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function UploadPanel({ onAdded }) {
  const [entries, setEntries] = useState([]); // [{ file, preview, caption, key }]
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });

  const onPick = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const mapped = files.map((f) => ({
      file: f,
      preview: URL.createObjectURL(f),
      caption: "",
      key: `${f.name}-${f.size}-${Math.random().toString(36).slice(2)}`,
    }));
    setEntries((prev) => [...prev, ...mapped]);
    e.target.value = ""; // lets you re-pick the same file later
  };

  const setCaption = (key, val) =>
    setEntries((prev) => prev.map((en) => (en.key === key ? { ...en, caption: val } : en)));

  const removeEntry = (key) =>
    setEntries((prev) => {
      const en = prev.find((x) => x.key === key);
      if (en) URL.revokeObjectURL(en.preview);
      return prev.filter((x) => x.key !== key);
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!entries.length) { toast.error("Choose at least one file"); return; }
    setBusy(true);
    setProgress({ done: 0, total: entries.length });
    let ok = 0;
    for (const en of entries) {
      try {
        const file_path = await uploadViaPresign(en.file, "gallery");
        const type = (en.file.type || "").startsWith("video") ? "video" : "image";
        await api.post("/admin/gallery", { type, file_path, caption: en.caption || "" });
        ok += 1;
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      } catch (err) {
        toast.error(`${en.file.name}: ${err?.response?.data?.detail || "upload failed"}`);
      }
    }
    entries.forEach((en) => URL.revokeObjectURL(en.preview));
    setEntries([]);
    setBusy(false);
    setProgress({ done: 0, total: 0 });
    if (ok) { toast.success(`Added ${ok} item${ok > 1 ? "s" : ""}`); onAdded?.(); }
  };

  return (
    <form onSubmit={submit} className="border hairline bg-[#F9F8F6] p-5" data-testid="admin-gallery-upload-form">
      <label className="btn-outline cursor-pointer !py-2 !px-4 inline-flex">
        <UploadCloud size={14} /> Choose files
        <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={onPick} data-testid="admin-gallery-file-input" />
      </label>
      <span className="ml-3 text-[12px] font-mono text-[#4A5A52]">
        {entries.length
          ? `${entries.length} file${entries.length > 1 ? "s" : ""} ready`
          : "Images or videos — select as many as you like"}
      </span>

      {entries.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {entries.map((en) => (
            <div key={en.key} className="border hairline bg-[#F2EFEA]">
              <div className="relative aspect-video bg-[#E6E4DD] overflow-hidden">
                {en.file.type.startsWith("video")
                  ? <video src={en.preview} className="w-full h-full object-cover" muted />
                  : <img src={en.preview} alt="" className="w-full h-full object-cover" />}
                <button type="button" onClick={() => removeEntry(en.key)} className="absolute top-1 right-1 bg-[#F9F8F6] border hairline p-1" aria-label="Remove">
                  <X size={12} />
                </button>
              </div>
              <div className="p-2">
                <input className="field text-sm" placeholder="Caption (optional)" value={en.caption} onChange={(e) => setCaption(en.key, e.target.value)} />
                <div className="text-[10px] font-mono text-[#7A857E] mt-1 truncate">{en.file.name}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5">
        <button type="submit" className="btn-terracotta disabled:opacity-60" disabled={busy || !entries.length} data-testid="admin-gallery-upload-submit">
          {busy
            ? (<><Loader2 className="animate-spin" size={14} /> Uploading {progress.done}/{progress.total}</>)
            : (<><Plus size={14} /> Add {entries.length || ""} to gallery</>)}
        </button>
      </div>
    </form>
  );
}
function EmbedPanel({ onAdded }) {
  const [url, setUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!url.trim()) { toast.error("Paste a YouTube or Vimeo URL"); return; }
    setBusy(true);
    try {
      await api.post("/admin/gallery/embed", { embed_url: url.trim(), caption: caption || "" });
      toast.success("Embed added");
      setUrl(""); setCaption("");
      onAdded?.();
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to add embed");
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="border hairline bg-[#F9F8F6] p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-4 items-start" data-testid="admin-gallery-embed-form">
      <label className="block">
        <span className="overline block mb-2">YouTube / Vimeo URL</span>
        <input className="field" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.youtube.com/watch?v=…" data-testid="admin-gallery-embed-url" />
      </label>
      <label className="block">
        <span className="overline block mb-2">Caption</span>
        <input className="field" value={caption} onChange={(e) => setCaption(e.target.value)} data-testid="admin-gallery-embed-caption" />
      </label>
      <button type="submit" className="btn-terracotta disabled:opacity-60" disabled={busy} data-testid="admin-gallery-embed-submit">
        {busy ? (<><Loader2 className="animate-spin" size={14} /> Saving</>) : (<><LinkIcon size={14} /> Add embed</>)}
      </button>
    </form>
  );
}
