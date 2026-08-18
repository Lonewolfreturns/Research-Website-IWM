import React, { useEffect, useState } from "react";
import {
  Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, ImagePlus, X,
} from "lucide-react";
import { toast } from "sonner";
import { api, fileUrl } from "../../utils/api";
import StoryEditor from "./StoryEditor";
import ImagePicker from "./ImagePicker";
import { isBlockEmpty, projectImages, storyBlocks } from "../../lib/projectStory";

const STATUSES = ["Ongoing", "Completed", "Planned"];

export default function ProjectsManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // { mode: 'create' | 'edit', project? }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/projects");
      setList(data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const onDelete = async (project) => {
    if (!window.confirm(`Delete "${project.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/projects/${project.id}`);
      toast.success("Project deleted");
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Delete failed");
    }
  };

  const swap = async (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= list.length) return;
    const next = [...list];
    [next[idx], next[j]] = [next[j], next[idx]];
    const items = next.map((p, i) => ({ id: p.id, display_order: i + 1 }));
    try {
      await api.put("/admin/projects/reorder", { items });
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Reorder failed");
    }
  };

  return (
    <div data-testid="admin-projects-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Admin · Projects</div>
          <h2 className="font-serif text-3xl text-[#1C2722] mt-1">Projects</h2>
          <p className="text-sm text-[#4A5A52] mt-2 max-w-2xl">
            Post the latest work: a short note, a picture, what&apos;s being done, who works on it,
            who else is involved, and who funds or sponsors it. The order here is the order visitors
            see — put the newest project at the top.
          </p>
        </div>
        <button className="btn-terracotta" onClick={() => setDialog({ mode: "create" })} data-testid="admin-project-add">
          <Plus size={14} /> Add project
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#4A5A52] py-10"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : list.length === 0 ? (
        <div className="py-10 text-[#4A5A52]">No projects yet.</div>
      ) : (
        <div className="border hairline">
          <table className="w-full text-sm">
            <thead className="bg-[#F2EFEA] border-b hairline text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:overline [&>th]:font-mono">
                <th className="w-[90px]">Picture</th>
                <th>Project</th>
                <th className="w-[120px]">Status</th>
                <th className="w-[90px]">Story</th>
                <th className="w-[120px]">Order</th>
                <th className="w-[220px] text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p, i) => (
                <tr key={p.id} className="border-b hairline [&>td]:px-4 [&>td]:py-3 align-middle" data-testid={`admin-project-row-${p.id}`}>
                  <td>
                    <div className="relative w-16 h-12 border hairline bg-[#F2EFEA] overflow-hidden">
                      {projectImages(p).length > 0 ? (
                        <img src={fileUrl(projectImages(p)[0])} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#7A857E]">
                          <ImagePlus size={14} />
                        </div>
                      )}
                      {projectImages(p).length > 1 && (
                        <span className="absolute bottom-0 right-0 font-mono text-[9px] text-[#F9F8F6] bg-[#1C2722]/80 px-1">
                          {projectImages(p).length}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="font-serif text-base text-[#1C2722]">{p.title}</div>
                    {p.summary && <div className="text-[12px] text-[#4A5A52] mt-1 line-clamp-2 max-w-xl">{p.summary}</div>}
                  </td>
                  <td>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#1C2722]">
                      {p.status || "—"}{p.year ? ` · ${p.year}` : ""}
                    </span>
                  </td>
                  <td>
                    <span className="text-[11px] font-mono uppercase tracking-widest text-[#7A857E]" data-testid={`admin-project-story-count-${p.id}`}>
                      {storyBlocks(p).length || "—"}
                    </span>
                  </td>
                  <td>
                    <div className="inline-flex items-center gap-1">
                      <button className="border hairline p-1 hover:bg-[#F2EFEA]" onClick={() => swap(i, -1)} aria-label="Move up" data-testid={`admin-project-up-${p.id}`}><ArrowUp size={14} /></button>
                      <button className="border hairline p-1 hover:bg-[#F2EFEA]" onClick={() => swap(i, 1)} aria-label="Move down" data-testid={`admin-project-down-${p.id}`}><ArrowDown size={14} /></button>
                      <span className="font-mono text-[11px] text-[#7A857E] ml-2">{p.display_order}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <button className="btn-outline !py-1.5 !px-3" onClick={() => setDialog({ mode: "edit", project: p })} data-testid={`admin-project-edit-${p.id}`}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button className="btn-outline !py-1.5 !px-3" style={{ borderColor: "#B95438", color: "#B95438" }} onClick={() => onDelete(p)} data-testid={`admin-project-delete-${p.id}`}>
                        <Trash2 size={12} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {dialog && (
        <ProjectDialog
          initial={dialog.project}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load(); }}
        />
      )}
    </div>
  );
}

function ProjectDialog({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);

  const [title, setTitle] = useState(initial?.title || "");
  const [summary, setSummary] = useState(initial?.summary || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [status, setStatus] = useState(initial?.status || "Ongoing");
  const [year, setYear] = useState(initial?.year || "");
  const [people, setPeople] = useState(initial?.people || "");
  const [partners, setPartners] = useState(initial?.partners || "");
  const [funding, setFunding] = useState(initial?.funding || "");
  const [sponsors, setSponsors] = useState(initial?.sponsors || "");
  const [externalUrl, setExternalUrl] = useState(initial?.external_url || "");
  const [story, setStory] = useState(() => storyBlocks(initial));
  const [images, setImages] = useState(() => projectImages(initial));
  const [saving, setSaving] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!summary.trim()) { toast.error("A short note is required"); return; }

    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        summary: summary.trim(),
        description: description.trim(),
        status: status || "",
        people: people.trim(),
        partners: partners.trim(),
        funding: funding.trim(),
        sponsors: sponsors.trim(),
        external_url: externalUrl.trim(),
        // Half-written blocks are dropped rather than published empty; the
        // admin can always add them back next time.
        story: story.filter((b) => !isBlockEmpty(b)),
      };
      payload.year = year === "" ? "" : Number(year);

      payload.images = images;
      // Kept in step with the first picture: the admin table thumbnail and any
      // record written before projects had more than one still read image_path.
      payload.image_path = images[0] || "";

      if (isEdit) {
        await api.put(`/admin/projects/${initial.id}`, payload);
        toast.success("Project updated");
      } else {
        await api.post("/admin/projects", payload);
        toast.success("Project added");
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
      data-testid="admin-project-dialog"
    >
      <div className="bg-[#F9F8F6] border hairline w-full max-w-4xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 bg-[#F9F8F6]">
          <div>
            <div className="overline">{isEdit ? "Edit" : "New"}</div>
            <h3 className="font-serif text-2xl text-[#1C2722]">{isEdit ? "Edit project" : "Add project"}</h3>
          </div>
          <button onClick={onClose} className="p-2 border hairline" aria-label="Close"><X size={16} /></button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-5">
          <label className="block">
            <span className="overline block mb-2">Project title</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="admin-project-title-input" required />
          </label>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-5">
            <label className="block">
              <span className="overline block mb-2">Status</span>
              <select className="field" value={status} onChange={(e) => setStatus(e.target.value)} data-testid="admin-project-status-input">
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="overline block mb-2">Year</span>
              <input
                type="number" className="field" value={year}
                onChange={(e) => setYear(e.target.value === "" ? "" : Number(e.target.value))}
                min="1900" max="2100"
                data-testid="admin-project-year-input"
              />
            </label>
          </div>

          <label className="block">
            <span className="overline block mb-2">Short note (shown first, keep it to a sentence or two)</span>
            <textarea rows={2} className="field" value={summary} onChange={(e) => setSummary(e.target.value)} data-testid="admin-project-summary-input" required />
          </label>

          <label className="block">
            <span className="overline block mb-2">What&apos;s being done</span>
            <textarea rows={5} className="field" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="The work itself — methods, site, stage, what comes next…" data-testid="admin-project-description-input" />
          </label>

          {/* Pictures */}
          <div className="border hairline p-5">
            <div className="overline mb-2">Pictures</div>
            <p className="text-[12px] text-[#4A5A52] mb-4 max-w-2xl leading-relaxed">
              Add as many as you like. The first is the cover — it is what shows on the projects
              list before anyone clicks. The rest are reached with arrows, in the order set here.
            </p>
            <ImagePicker
              paths={images}
              onChange={setImages}
              folder="projects"
              coverLabel="Cover"
              addLabel={images.length ? "Add more pictures" : "Choose pictures"}
              testIdPrefix="admin-project-images"
            />
          </div>

          {/* Attribution */}
          <div className="border hairline p-5 space-y-5">
            <div className="overline">Who is involved, and who pays for it</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <label className="block">
                <span className="overline block mb-2">Who works on it</span>
                <input className="field" value={people} onChange={(e) => setPeople(e.target.value)} placeholder="Gordon Price, Akash Kolla" data-testid="admin-project-people-input" />
              </label>
              <label className="block">
                <span className="overline block mb-2">Who else is involved</span>
                <input className="field" value={partners} onChange={(e) => setPartners(e.target.value)} placeholder="Dalhousie Faculty of Agriculture, Town of Truro" data-testid="admin-project-partners-input" />
              </label>
              <label className="block">
                <span className="overline block mb-2">Funded by</span>
                <input className="field" value={funding} onChange={(e) => setFunding(e.target.value)} placeholder="NSERC Discovery Grant" data-testid="admin-project-funding-input" />
              </label>
              <label className="block">
                <span className="overline block mb-2">Sponsors &amp; contributions</span>
                <input className="field" value={sponsors} onChange={(e) => setSponsors(e.target.value)} placeholder="Equipment loan — Divert NS" data-testid="admin-project-sponsors-input" />
              </label>
            </div>
          </div>

          <StoryEditor blocks={story} onChange={setStory} />

          <label className="block">
            <span className="overline block mb-2">Project link (optional)</span>
            <input type="url" className="field" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://…" data-testid="admin-project-url-input" />
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
            <button type="submit" className="btn-terracotta disabled:opacity-60" disabled={saving} data-testid="admin-project-save">
              {saving ? (<><Loader2 className="animate-spin" size={14} /> Saving</>) : (isEdit ? "Save changes" : "Create project")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
