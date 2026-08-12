import React, { useEffect, useState } from "react";
import { Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, Image as ImgIcon, X } from "lucide-react";
import { api, fileUrl, uploadViaPresign } from "../../utils/api";
import { tierForMember, ALL_TIERS } from "../../lib/teamGroups";
import { toast } from "sonner";

// Mirrors the alumni check in lib/teamGroups so the table, the dialog and the
// public page all agree on what counts as an alumni record.
const isAlumniRecord = (m) => m?.alumni === true || m?.alumni === 1 || m?.alumni === "true";

export default function TeamManager() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // { mode: "create"|"edit", member? }

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/team");
      setList(data || []);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Failed to load team");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onDelete = async (member) => {
    if (!window.confirm(`Delete ${member.name}? This cannot be undone.`)) return;
    try {
      await api.delete(`/admin/team/${member.id}`);
      toast.success("Team member deleted");
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
  // Renumber everything so orders are always distinct and gapless.
  const items = next.map((m, i) => ({ id: m.id, display_order: i + 1 }));
  try {
    await api.put("/admin/team/reorder", { items });
    load();
  } catch (e) {
    toast.error(e?.response?.data?.detail || "Reorder failed");
  }
};

  return (
    <div data-testid="admin-team-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Admin · Team</div>
          <h2 className="font-serif text-3xl text-[#1C2722] mt-1">Team members</h2>
          <p className="text-sm text-[#4A5A52] mt-2 max-w-2xl">
            Each person is placed on the public page by their <strong>Group</strong>, picked in the
            form. Leave it on <em>Auto</em> and it is guessed from the role text; set it explicitly
            when the guess is wrong. Groups run Principal Investigator, Postdoctoral, Technical,
            Doctoral, Masters, Undergraduate. Tick <strong>Alumni</strong> to move someone into the
            alumni list at the foot of the page.
          </p>
        </div>
        <button className="btn-terracotta" onClick={() => setDialog({ mode: "create" })} data-testid="admin-team-add">
          <Plus size={14} /> Add member
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[#4A5A52] py-10"><Loader2 className="animate-spin" size={16} /> Loading…</div>
      ) : list.length === 0 ? (
        <div className="py-10 text-[#4A5A52]">No team members yet.</div>
      ) : (
        <div className="border hairline">
          <table className="w-full text-sm">
            <thead className="bg-[#F2EFEA] border-b hairline text-left">
              <tr className="[&>th]:px-4 [&>th]:py-3 [&>th]:overline [&>th]:font-mono">
                <th className="w-[90px]">Photo</th>
                <th>Name</th>
                <th>Role</th>
                <th className="w-[190px]">Group</th>
                <th className="w-[110px]">Order</th>
                <th className="w-[180px] text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m, i) => (
                <tr key={m.id} className="border-b hairline [&>td]:px-4 [&>td]:py-3 align-middle" data-testid={`admin-team-row-${m.id}`}>
                  <td>
                    <div className="w-14 h-14 border hairline bg-[#E6E4DD] overflow-hidden">
                      {m.image_path ? (
                        <img src={fileUrl(m.image_path)} alt={m.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#7A857E]"><ImgIcon size={18} /></div>
                      )}
                    </div>
                  </td>
                  <td className="font-serif text-base text-[#1C2722]">{m.name}</td>
                  <td className="text-[#4A5A52]">{m.role}</td>
                  <td>
                    <span className="inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#1C2722]" data-testid={`admin-team-group-${m.id}`}>
                      {React.createElement(tierForMember(m).Icon, { size: 12, className: "text-[#B95438] shrink-0" })}
                      {tierForMember(m).label}
                    </span>
                    <span className="block mt-1 text-[10px] font-mono uppercase tracking-widest text-[#7A857E]">
                      {m.group ? "· set" : "· auto"}
                    </span>
                    {isAlumniRecord(m) && (
                      <span className="block mt-1 text-[10px] font-mono uppercase tracking-widest text-[#7A857E]" data-testid={`admin-team-alumni-${m.id}`}>
                        · Alumni
                      </span>
                    )}
                  </td>
                  <td>
                    <div className="inline-flex items-center gap-1">
                      <button className="border hairline p-1 hover:bg-[#F2EFEA]" onClick={() => swap(i, -1)} aria-label="Move up" data-testid={`admin-team-up-${m.id}`}><ArrowUp size={14} /></button>
                      <button className="border hairline p-1 hover:bg-[#F2EFEA]" onClick={() => swap(i, 1)} aria-label="Move down" data-testid={`admin-team-down-${m.id}`}><ArrowDown size={14} /></button>
                      <span className="font-mono text-[11px] text-[#7A857E] ml-2">{m.display_order}</span>
                    </div>
                  </td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-2">
                      <button className="btn-outline !py-1.5 !px-3" onClick={() => setDialog({ mode: "edit", member: m })} data-testid={`admin-team-edit-${m.id}`}>
                        <Pencil size={12} /> Edit
                      </button>
                      <button className="btn-outline !py-1.5 !px-3" style={{ borderColor: "#B95438", color: "#B95438" }} onClick={() => onDelete(m)} data-testid={`admin-team-delete-${m.id}`}>
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
        <TeamDialog
          initial={dialog.member}
          onClose={() => setDialog(null)}
          onSaved={() => { setDialog(null); load(); }}
        />
      )}
    </div>
  );
}

function TeamDialog({ initial, onClose, onSaved }) {
  const isEdit = Boolean(initial);
  const [name, setName] = useState(initial?.name || "");
  const [role, setRole] = useState(initial?.role || "");
  const [bio, setBio] = useState(initial?.bio || "");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(initial?.image_path ? fileUrl(initial.image_path) : "");
  const [saving, setSaving] = useState(false);

  // Social / professional links (all optional)
  const [website, setWebsite] = useState(initial?.website || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [linkedin, setLinkedin] = useState(initial?.linkedin || "");
  const [twitter, setTwitter] = useState(initial?.twitter || "");
  const [github, setGithub] = useState(initial?.github || "");
  const [scholar, setScholar] = useState(initial?.scholar || "");
  const [facebook, setFacebook] = useState(initial?.facebook || "");
  const [alumni, setAlumni] = useState(isAlumniRecord(initial));
  const [group, setGroup] = useState(initial?.group || "");

  const onFile = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    if (f) setPreview(URL.createObjectURL(f));
  };

const onSubmit = async (e) => {
  e.preventDefault();
  if (!name.trim() || !role.trim()) { toast.error("Name and role are required"); return; }
  setSaving(true);
  try {
    let image_path = initial?.image_path || "";
    if (file) image_path = await uploadViaPresign(file, "team");
    const payload = {
      name: name.trim(), role: role.trim(), bio: bio || "",
      website: website || "", email: email || "", linkedin: linkedin || "",
      twitter: twitter || "", github: github || "", scholar: scholar || "",
      facebook: facebook || "", image_path,
      alumni: Boolean(alumni),
      group: group || "",
    };
    if (isEdit) {
      await api.put(`/admin/team/${initial.id}`, payload);
      toast.success("Team member updated");
    } else {
      await api.post("/admin/team", payload);
      toast.success("Team member added");
    }
    onSaved?.();
  } catch (err) {
    toast.error(err?.response?.data?.detail || "Save failed");
  } finally { setSaving(false); }
};

  return (
    <div className="fixed inset-0 z-50 bg-[#1C2722]/60 flex items-center justify-center p-4" onClick={onClose} data-testid="admin-team-dialog">
      <div className="bg-[#F9F8F6] border hairline w-full max-w-3xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b hairline sticky top-0 bg-[#F9F8F6]">
          <div>
            <div className="overline">{isEdit ? "Edit" : "New"}</div>
            <h3 className="font-serif text-2xl text-[#1C2722]">{isEdit ? "Edit team member" : "Add team member"}</h3>
          </div>
          <button onClick={onClose} className="p-2 border hairline" aria-label="Close"><X size={16} /></button>
        </div>
        <form onSubmit={onSubmit} className="p-6 grid grid-cols-1 md:grid-cols-[160px_1fr] gap-6">
          <div>
            <div className="overline mb-2">Photo</div>
            <div className="w-40 h-48 border hairline bg-[#E6E4DD] overflow-hidden">
              {preview ? <img src={preview} alt="Preview" className="w-full h-full object-cover" /> :
                <div className="w-full h-full flex items-center justify-center text-[#7A857E]"><ImgIcon size={24} /></div>}
            </div>
            <label className="btn-outline mt-3 !py-2 !px-3 cursor-pointer justify-center">
              {file || isEdit ? "Change photo" : "Upload photo"}
              <input type="file" accept="image/*" className="hidden" onChange={onFile} data-testid="admin-team-photo-input" />
            </label>
          </div>
          <div className="space-y-4">
            <label className="block">
              <span className="overline block mb-2">Name</span>
              <input className="field" value={name} onChange={(e) => setName(e.target.value)} data-testid="admin-team-name-input" required />
            </label>
            <label className="block">
              <span className="overline block mb-2">Role</span>
              <input className="field" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Postdoctoral Fellow, PhD Student, Lab Technician…" data-testid="admin-team-role-input" required />
              <span className="block mt-2 text-[11px] font-mono uppercase tracking-widest text-[#7A857E]">
                Their job title, shown on the card exactly as typed
              </span>
            </label>

            <label className="block">
              <span className="overline block mb-2">Group — where they appear on the page</span>
              <select
                className="field"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                data-testid="admin-team-group-input"
              >
                <option value="">Auto — from the role text</option>
                {ALL_TIERS.map((t) => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
              <span className="mt-2 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-[#4A5A52]" data-testid="admin-team-group-preview">
                {group ? "Placed in:" : role.trim() ? "Auto-detected:" : "Type a role, or pick a group above —"}
                {React.createElement(tierForMember({ group, role }).Icon, { size: 12, className: "text-[#B95438]" })}
                <strong className="text-[#1C2722]">{tierForMember({ group, role }).label}</strong>
              </span>
            </label>

            <label className="flex items-start gap-3 border hairline p-4 bg-[#F2EFEA] cursor-pointer">
              <input
                type="checkbox"
                checked={alumni}
                onChange={(e) => setAlumni(e.target.checked)}
                className="mt-1"
                data-testid="admin-team-alumni-input"
              />
              <span>
                <span className="overline block">Alumni</span>
                <span className="text-[13px] text-[#4A5A52] leading-relaxed block mt-1">
                  Moves this person into the alumni list below the current roster. They keep their
                  group, so a former postdoc still appears under Postdoctoral Fellows there.
                </span>
              </span>
            </label>
            <label className="block">
              <span className="overline block mb-2">Bio</span>
              <textarea rows={4} className="field" value={bio} onChange={(e) => setBio(e.target.value)} data-testid="admin-team-bio-input" />
            </label>

            <div className="pt-3 border-t hairline">
              <div className="overline mb-3">Social &amp; professional links — leave blank to hide the icon</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">Website</span>
                  <input className="field" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" data-testid="admin-team-website-input" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">Email</span>
                  <input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@domain.ca" data-testid="admin-team-email-input" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">Google Scholar</span>
                  <input className="field" value={scholar} onChange={(e) => setScholar(e.target.value)} placeholder="https://scholar.google.com/…" data-testid="admin-team-scholar-input" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">Facebook</span>
                  <input className="field" value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="https://www.facebook.com/…" data-testid="admin-team-facebook-input" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">LinkedIn</span>
                  <input className="field" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="https://www.linkedin.com/in/…" data-testid="admin-team-linkedin-input" />
                </label>
                <label className="block">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">X / Twitter</span>
                  <input className="field" value={twitter} onChange={(e) => setTwitter(e.target.value)} placeholder="https://twitter.com/…" data-testid="admin-team-twitter-input" />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-[11px] font-mono tracking-widest uppercase text-[#4A5A52] block mb-1">GitHub</span>
                  <input className="field" value={github} onChange={(e) => setGithub(e.target.value)} placeholder="https://github.com/…" data-testid="admin-team-github-input" />
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-outline">Cancel</button>
              <button type="submit" className="btn-terracotta disabled:opacity-60" disabled={saving} data-testid="admin-team-save">
                {saving ? (<><Loader2 className="animate-spin" size={14} /> Saving</>) : (isEdit ? "Save changes" : "Create")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
