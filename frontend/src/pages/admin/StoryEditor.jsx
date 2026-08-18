import React, { useEffect, useState } from "react";
import {
  Plus, Trash2, ArrowUp, ArrowDown, Loader2, ImagePlus, Film, Link2,
  Quote as QuoteIcon, Type, Heading, Images, Check,
} from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl, uploadViaPresign } from "../../utils/api";
import ImagePicker from "./ImagePicker";
import { BLOCK_TYPES, blockImages, embedSrc, newBlock } from "../../lib/projectStory";

const ICONS = {
  text: Type,
  heading: Heading,
  quote: QuoteIcon,
  image: ImagePlus,
  video: Film,
  embed: Film,
  link: Link2,
  gallery: Images,
};

/**
 * The story editor inside the project dialog.
 *
 * A story is written a piece at a time, so the editor is a list of blocks the
 * admin appends to and reorders — not one big rich-text box. Uploads happen the
 * moment a file is picked, so the block holds a stored path and saving the
 * project is only ever a small JSON write.
 */
export default function StoryEditor({ blocks, onChange }) {
  const list = Array.isArray(blocks) ? blocks : [];

  const patch = (id, fields) =>
    onChange(list.map((b) => (b.id === id ? { ...b, ...fields } : b)));

  const add = (type) => onChange([...list, newBlock(type)]);

  const remove = (id) => {
    const b = list.find((x) => x.id === id);
    const written = b && Object.entries(b).some(([k, v]) =>
      !["id", "type"].includes(k) && (Array.isArray(v) ? v.length : String(v || "").trim())
    );
    if (written && !window.confirm("Remove this block? Anything typed into it is lost.")) return;
    onChange(list.filter((x) => x.id !== id));
  };

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  return (
    <div className="border hairline p-5" data-testid="admin-story-editor">
      <div className="overline">The story</div>
      <p className="text-[12px] text-[#4A5A52] mt-2 mb-5 max-w-2xl leading-relaxed">
        The long-form account visitors reach from &ldquo;Read the full story&rdquo;. Add to it as the
        work goes on — a paragraph after a site visit, a photo when a trial runs, a link when the
        paper lands. Nothing here is required; a project with no blocks simply shows no story link.
      </p>

      {list.length === 0 ? (
        <div className="border hairline border-dashed p-6 text-center text-[13px] text-[#7A857E]" data-testid="admin-story-empty">
          No story yet. Add the first block below.
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {list.map((b, i) => (
            <BlockEditor
              key={b.id}
              block={b}
              index={i}
              total={list.length}
              onPatch={(fields) => patch(b.id, fields)}
              onRemove={() => remove(b.id)}
              onMove={(dir) => move(i, dir)}
            />
          ))}
        </div>
      )}

      <div className="mt-5 pt-5 border-t hairline">
        <div className="overline mb-3">Add a block</div>
        <div className="flex flex-wrap gap-2">
          {BLOCK_TYPES.map(({ type, label, hint }) => {
            const Icon = ICONS[type] || Plus;
            return (
              <button
                key={type}
                type="button"
                title={hint}
                onClick={() => add(type)}
                className="btn-outline !py-2 !px-3"
                data-testid={`admin-story-add-${type}`}
              >
                <Icon size={12} /> {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BlockEditor({ block: b, index, total, onPatch, onRemove, onMove }) {
  const meta = BLOCK_TYPES.find((t) => t.type === b.type);
  const Icon = ICONS[b.type] || Type;

  return (
    <div className="border hairline bg-[#F2EFEA]" data-testid={`admin-story-block-${b.id}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-2 border-b hairline">
        <span className="overline inline-flex items-center gap-2">
          <Icon size={12} className="text-[#B95438]" />
          {String(index + 1).padStart(2, "0")} · {meta?.label || b.type}
        </span>
        <span className="inline-flex items-center gap-1">
          <button type="button" className="border hairline p-1 bg-[#F9F8F6] hover:bg-[#E6E4DD] disabled:opacity-40"
                  onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move block up">
            <ArrowUp size={13} />
          </button>
          <button type="button" className="border hairline p-1 bg-[#F9F8F6] hover:bg-[#E6E4DD] disabled:opacity-40"
                  onClick={() => onMove(1)} disabled={index === total - 1} aria-label="Move block down">
            <ArrowDown size={13} />
          </button>
          <button type="button" className="border hairline p-1 bg-[#F9F8F6] hover:bg-[#E6E4DD] ml-1"
                  style={{ borderColor: "#B95438", color: "#B95438" }}
                  onClick={onRemove} aria-label="Remove block"
                  data-testid={`admin-story-remove-${b.id}`}>
            <Trash2 size={13} />
          </button>
        </span>
      </div>

      <div className="p-4 space-y-3">
        <BlockFields block={b} onPatch={onPatch} />
      </div>
    </div>
  );
}

function BlockFields({ block: b, onPatch }) {
  if (b.type === "heading") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3">
        <label className="block">
          <span className="overline block mb-2">Heading</span>
          <input className="field" value={b.text || ""} onChange={(e) => onPatch({ text: e.target.value })}
                 placeholder="First trial in the field" />
        </label>
        <label className="block">
          <span className="overline block mb-2">Date (optional)</span>
          <input className="field" value={b.date || ""} onChange={(e) => onPatch({ date: e.target.value })}
                 placeholder="March 2026" />
        </label>
      </div>
    );
  }

  if (b.type === "quote") {
    return (
      <>
        <label className="block">
          <span className="overline block mb-2">Quote</span>
          <textarea rows={3} className="field" value={b.text || ""} onChange={(e) => onPatch({ text: e.target.value })} />
        </label>
        <label className="block">
          <span className="overline block mb-2">Who said it</span>
          <input className="field" value={b.attribution || ""} onChange={(e) => onPatch({ attribution: e.target.value })}
                 placeholder="Gordon Price, Principal Investigator" />
        </label>
      </>
    );
  }

  if (b.type === "image") {
    return (
      <>
        <ImagePicker
          paths={blockImages(b)}
          // Written back as `paths`; a block saved when a picture block held a
          // single `path` is read through blockImages and rewritten as a list.
          onChange={(paths) => onPatch({ paths, path: "" })}
          folder="projects/story"
          addLabel={blockImages(b).length ? "Add more pictures" : "Choose pictures"}
          testIdPrefix={`admin-story-images-${b.id}`}
        />
        {blockImages(b).length > 1 && (
          <p className="text-[11px] text-[#7A857E]">
            Shown as one frame with arrows to move through, in this order.
          </p>
        )}
        <label className="block">
          <span className="overline block mb-2">Caption (optional)</span>
          <input className="field" value={b.caption || ""} onChange={(e) => onPatch({ caption: e.target.value })} />
        </label>
      </>
    );
  }

  if (b.type === "video") {
    return <MediaBlock block={b} onPatch={onPatch} />;
  }

  if (b.type === "embed") {
    const preview = embedSrc(b.url);
    return (
      <>
        <label className="block">
          <span className="overline block mb-2">YouTube or Vimeo link</span>
          <input className="field" value={b.url || ""} onChange={(e) => onPatch({ url: e.target.value })}
                 placeholder="https://www.youtube.com/watch?v=…" />
        </label>
        <label className="block">
          <span className="overline block mb-2">Caption (optional)</span>
          <input className="field" value={b.caption || ""} onChange={(e) => onPatch({ caption: e.target.value })} />
        </label>
        {preview && (
          <div className="aspect-video max-w-md border hairline bg-[#1C2722]">
            <iframe src={preview} title="Embed preview" className="w-full h-full border-0" />
          </div>
        )}
      </>
    );
  }

  if (b.type === "link") {
    return (
      <>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="block">
            <span className="overline block mb-2">Address</span>
            <input type="url" className="field" value={b.url || ""} onChange={(e) => onPatch({ url: e.target.value })}
                   placeholder="https://doi.org/…" />
          </label>
          <label className="block">
            <span className="overline block mb-2">Link text</span>
            <input className="field" value={b.label || ""} onChange={(e) => onPatch({ label: e.target.value })}
                   placeholder="The paper this trial produced" />
          </label>
        </div>
        <label className="block">
          <span className="overline block mb-2">Note (optional)</span>
          <input className="field" value={b.note || ""} onChange={(e) => onPatch({ note: e.target.value })} />
        </label>
      </>
    );
  }

  if (b.type === "gallery") {
    return <GalleryPicker ids={b.ids || []} onChange={(ids) => onPatch({ ids })} />;
  }

  return (
    <label className="block">
      <span className="overline block mb-2">Paragraph</span>
      <textarea rows={6} className="field" value={b.text || ""} onChange={(e) => onPatch({ text: e.target.value })}
                placeholder="Write it as you would tell it. Blank lines become paragraph breaks." />
    </label>
  );
}

/** Video blocks: a single uploaded clip. Pictures use ImagePicker instead. */
function MediaBlock({ block: b, onPatch }) {
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("video/")) {
      toast.error("Please choose a video file");
      return;
    }
    setBusy(true);
    try {
      // Straight to S3 via a presigned URL, so a large clip never has to fit
      // through the API.
      const path = await uploadViaPresign(f, "projects/story");
      onPatch({ path });
      toast.success("Video uploaded");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="w-40 aspect-[4/3] border hairline bg-[#E6E4DD] overflow-hidden flex items-center justify-center">
          {b.path ? (
            <video src={fileUrl(b.path)} className="w-full h-full object-cover" preload="metadata" muted />
          ) : (
            <span className="text-[#7A857E]"><Film size={18} /></span>
          )}
        </div>
        <label className="inline-flex items-center gap-2 cursor-pointer border hairline px-4 py-2 text-[12px] font-mono tracking-widest uppercase text-[#1C2722] bg-[#F9F8F6] hover:bg-[#E6E4DD] transition-colors">
          {busy ? <Loader2 className="animate-spin" size={14} /> : <Film size={14} />}
          {busy ? "Uploading" : b.path ? "Replace" : "Choose video"}
          <input type="file" className="hidden" accept="video/*" onChange={onPick} disabled={busy} />
        </label>
      </div>
      <label className="block">
        <span className="overline block mb-2">Caption (optional)</span>
        <input className="field" value={b.caption || ""} onChange={(e) => onPatch({ caption: e.target.value })} />
      </label>
    </>
  );
}

/**
 * Picks figures that are already in the gallery, rather than uploading a second
 * copy — that is what makes the gallery and the project stories one archive
 * instead of two.
 */
function GalleryPicker({ ids, onChange }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const chosen = new Set((ids || []).map(String));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/gallery");
        if (!cancelled) setItems(data || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const toggle = (id) => {
    const key = String(id);
    // Kept in the order they were picked, which is the order they will appear.
    onChange(chosen.has(key) ? (ids || []).filter((x) => String(x) !== key) : [...(ids || []), key]);
  };

  if (loading) {
    return <div className="flex items-center gap-2 text-[13px] text-[#4A5A52]"><Loader2 className="animate-spin" size={14} /> Loading gallery…</div>;
  }
  if (items.length === 0) {
    return <div className="text-[13px] text-[#7A857E]">The gallery is empty — add figures under the Gallery tab first.</div>;
  }

  return (
    <div>
      <div className="overline mb-3">
        Pick figures · {chosen.size} selected
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 max-h-64 overflow-y-auto pr-1">
        {items.map((it) => {
          const on = chosen.has(String(it.id));
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => toggle(it.id)}
              aria-pressed={on}
              title={it.caption || "Gallery item"}
              className={`relative aspect-square border overflow-hidden bg-[#E6E4DD] ${on ? "border-[#B95438] border-2" : "hairline"}`}
              data-testid={`admin-story-gallery-pick-${it.id}`}
            >
              {it.type === "image" ? (
                <img src={fileUrl(it.file_path)} alt="" className="w-full h-full object-cover" />
              ) : it.type === "video" ? (
                <video src={fileUrl(it.file_path)} className="w-full h-full object-cover" preload="metadata" muted />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-[#7A857E]"><Film size={16} /></span>
              )}
              {on && (
                <span className="absolute top-1 right-1 bg-[#B95438] text-[#F9F8F6] p-0.5">
                  <Check size={11} />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
