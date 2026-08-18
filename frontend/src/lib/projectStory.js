/**
 * The story a project accumulates over time.
 *
 * A story is an ordered list of blocks kept on the project record itself, under
 * `story`. The CMS Lambda stores whatever JSON it is handed for a project and
 * merges patches on update, so adding a block type here needs no backend change
 * and no migration — projects written before stories existed simply have none.
 *
 * Blocks are deliberately small and additive, because that is how the lab will
 * actually write them: a paragraph after a site visit, a photo when the trial
 * runs, a link when the paper lands.
 */

export const BLOCK_TYPES = [
  { type: "text", label: "Paragraph", hint: "A passage of the story. Blank lines are kept." },
  { type: "heading", label: "Section heading", hint: "Breaks a long story into chapters. Can carry a date." },
  { type: "quote", label: "Pull quote", hint: "A line worth setting apart, with who said it." },
  { type: "image", label: "Pictures", hint: "One or more, with a caption. Several become a frame with arrows." },
  { type: "video", label: "Video file", hint: "An uploaded clip, played inline." },
  { type: "embed", label: "Embedded video", hint: "A YouTube or Vimeo link, played inline." },
  { type: "link", label: "Link", hint: "A paper, dataset, news item or partner page." },
  { type: "gallery", label: "From the gallery", hint: "Pick figures already in the gallery." },
];

export const BLOCK_LABELS = Object.fromEntries(BLOCK_TYPES.map((b) => [b.type, b.label]));

const rid = () =>
  `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function newBlock(type) {
  const base = { id: rid(), type };
  switch (type) {
    case "heading": return { ...base, text: "", date: "" };
    case "quote": return { ...base, text: "", attribution: "" };
    case "image": return { ...base, paths: [], caption: "" };
    case "video": return { ...base, path: "", caption: "" };
    case "embed": return { ...base, url: "", caption: "" };
    case "link": return { ...base, url: "", label: "", note: "" };
    case "gallery": return { ...base, ids: [] };
    default: return { ...base, type: "text", text: "" };
  }
}

/** Blocks with nothing in them are dropped on save rather than published empty. */
export function isBlockEmpty(b) {
  if (!b) return true;
  switch (b.type) {
    case "image": return blockImages(b).length === 0;
    case "video": return !String(b.path || "").trim();
    case "embed":
    case "link": return !String(b.url || "").trim();
    case "gallery": return !(Array.isArray(b.ids) && b.ids.length > 0);
    default: return !String(b.text || "").trim();
  }
}

const paths = (v) =>
  (Array.isArray(v) ? v : []).map((x) => String(x || "").trim()).filter(Boolean);

/**
 * A project's pictures, in order, the first being the cover.
 *
 * Projects used to carry a single `image_path` and many still do, so the list
 * falls back to it. `image_path` is kept written to the first picture on save,
 * which is what the admin table thumbnail and any older client still read.
 */
export function projectImages(project) {
  const list = paths(project?.images);
  if (list.length > 0) return list;
  const single = String(project?.image_path || "").trim();
  return single ? [single] : [];
}

/** The same, for a picture block in a story. */
export function blockImages(block) {
  const list = paths(block?.paths);
  if (list.length > 0) return list;
  const single = String(block?.path || "").trim();
  return single ? [single] : [];
}

/** Always an array, whatever the record happens to hold. */
export function storyBlocks(project) {
  const raw = project?.story;
  if (!Array.isArray(raw)) return [];
  return raw.filter((b) => b && typeof b === "object" && b.type);
}

export function hasStory(project) {
  return storyBlocks(project).length > 0;
}

/** Gallery items referenced anywhere in a project's story. */
export function storyGalleryIds(project) {
  const ids = [];
  for (const b of storyBlocks(project)) {
    if (b.type === "gallery" && Array.isArray(b.ids)) ids.push(...b.ids.map(String));
  }
  return ids;
}

/**
 * Turn a YouTube or Vimeo link into something an iframe can play.
 * Anything already in embed form, or from another host, is passed through — the
 * admin may well paste an embed URL straight from the provider.
 */
export function embedSrc(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const yt = raw.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return raw;
}

/**
 * Split a credit line into plain text and roster members named in it.
 *
 * Scans for names rather than splitting on commas, so "Gordon Price and Akash
 * Kolla" finds both and text that isn't a person ("two MSc students") is left
 * alone. Longest names are tried first: with both "Sam" and "Sam Oyelaran" on
 * the roster, matching the short one first would leave a stray "Oyelaran".
 *
 * Returns segments of { text } or { text, member } — the caller decides what a
 * matched member should render as.
 */
export function splitNames(text, roster) {
  const raw = String(text || "");
  const names = (roster || [])
    .filter((m) => m?.id && typeof m.name === "string" && m.name.trim())
    .map((m) => ({ member: m, name: m.name.trim() }))
    .sort((a, b) => b.name.length - a.name.length);
  if (!raw || names.length === 0) return raw ? [{ text: raw }] : [];

  const out = [];
  let rest = raw;
  while (rest) {
    let hit = null;
    for (const n of names) {
      const idx = rest.toLowerCase().indexOf(n.name.toLowerCase());
      if (idx !== -1 && (hit === null || idx < hit.idx)) hit = { idx, n };
    }
    if (!hit) { out.push({ text: rest }); break; }
    if (hit.idx > 0) out.push({ text: rest.slice(0, hit.idx) });
    // Sliced from the original so the credit keeps whatever capitalisation the
    // admin typed, rather than echoing the roster spelling back.
    out.push({
      text: rest.slice(hit.idx, hit.idx + hit.n.name.length),
      member: hit.n.member,
    });
    rest = rest.slice(hit.idx + hit.n.name.length);
  }
  return out;
}

/** Every roster member named in a project's credits, in roster order, no repeats. */
export function projectMembers(project, roster) {
  const seen = new Set();
  const found = [];
  const fields = [project?.people, project?.partners].filter(Boolean);
  for (const f of fields) {
    for (const seg of splitNames(f, roster)) {
      if (seg.member && !seen.has(seg.member.id)) {
        seen.add(seg.member.id);
        found.push(seg.member);
      }
    }
  }
  return found;
}
