import React, { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { useSettings } from "../../context/SettingsContext";

const FIELDS = [
  { k: "org_name", label: "Organisation name", type: "text" },
  { k: "tagline", label: "Tagline / short description", type: "text" },
  { k: "affiliation", label: "Affiliation (e.g. partner university)", type: "text" },
  { k: "email", label: "Public email", type: "email" },
  { k: "phone", label: "Public phone", type: "text" },
  { k: "address_line1", label: "Address line 1", type: "text" },
  { k: "address_line2", label: "Address line 2", type: "text" },
  { k: "city", label: "City", type: "text" },
  { k: "region", label: "Province / region", type: "text" },
  { k: "postal_code", label: "Postal code", type: "text" },
  { k: "country", label: "Country", type: "text" },
  { k: "office_hours", label: "Office hours", type: "text" },
];

export default function SettingsManager() {
  const { settings, updateSettings, refresh } = useSettings();
  const [form, setForm] = useState(settings);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateSettings(form);
      await refresh();
      toast.success("Site settings saved");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div data-testid="admin-settings-manager">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="overline">Admin · Site</div>
          <h2 className="font-serif text-3xl text-[#1C2722] mt-1">Contact &amp; address</h2>
          <p className="text-sm text-[#4A5A52] mt-2 max-w-2xl">
            These fields appear in the navbar, footer, Contact page and the reusable contact
            section on every public page. Changes take effect as soon as you save.
          </p>
        </div>
        <button onClick={submit} className="btn-terracotta disabled:opacity-60" disabled={saving} data-testid="admin-settings-save">
          {saving ? (<><Loader2 className="animate-spin" size={14} /> Saving</>) : (<><Save size={14} /> Save changes</>)}
        </button>
      </div>

      <form onSubmit={submit} className="border hairline bg-[#F9F8F6] p-6 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-5" data-testid="admin-settings-form">
        {FIELDS.map((f) => (
          <label key={f.k} className={`block ${(f.k === "tagline" || f.k === "affiliation") ? "md:col-span-2" : ""}`}>
            <span className="overline block mb-2">{f.label}</span>
            <input
              type={f.type}
              className="field"
              value={form[f.k] ?? ""}
              onChange={set(f.k)}
              data-testid={`admin-settings-${f.k}`}
            />
          </label>
        ))}
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" className="btn-terracotta disabled:opacity-60" disabled={saving} data-testid="admin-settings-save-bottom">
            {saving ? (<><Loader2 className="animate-spin" size={14} /> Saving</>) : (<><Save size={14} /> Save changes</>)}
          </button>
        </div>
      </form>
    </div>
  );
}
