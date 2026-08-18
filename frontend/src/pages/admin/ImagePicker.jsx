import React, { useState } from "react";
import { ImagePlus, Loader2, X, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { fileUrl, uploadViaPresign } from "../../utils/api";

/**
 * Manages an ordered list of uploaded pictures.
 *
 * Files go to S3 the moment they are picked, so the list holds stored paths and
 * saving the record is only ever a small JSON write — the same arrangement the
 * story editor uses. Several files can be chosen at once; they are uploaded in
 * order so the sequence the admin selected is the sequence visitors page
 * through.
 */
export default function ImagePicker({
  paths = [],
  onChange,
  folder = "projects",
  coverLabel = "",
  addLabel = "Add pictures",
  testIdPrefix = "admin-images",
}) {
  const [busy, setBusy] = useState(0);

  const onPick = async (e) => {
    const files = [...(e.target.files || [])].filter((f) => f.type.startsWith("image/"));
    const rejected = (e.target.files?.length || 0) - files.length;
    if (rejected > 0) toast.error(`${rejected} file${rejected === 1 ? "" : "s"} skipped — pictures only`);
    e.target.value = "";
    if (files.length === 0) return;

    setBusy(files.length);
    const uploaded = [];
    try {
      for (const f of files) {
        // Sequential on purpose: it keeps the order the admin picked, and a
        // batch of full-size field photos in parallel is a lot to ask of a
        // conference-centre connection.
        uploaded.push(await uploadViaPresign(f, folder));
        setBusy((n) => n - 1);
      }
      toast.success(`${uploaded.length} picture${uploaded.length === 1 ? "" : "s"} uploaded`);
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Upload failed");
    } finally {
      setBusy(0);
      if (uploaded.length) onChange([...paths, ...uploaded]);
    }
  };

  const move = (idx, dir) => {
    const j = idx + dir;
    if (j < 0 || j >= paths.length) return;
    const next = [...paths];
    [next[idx], next[j]] = [next[j], next[idx]];
    onChange(next);
  };

  const remove = (idx) => onChange(paths.filter((_, i) => i !== idx));

  return (
    <div data-testid={testIdPrefix}>
      {paths.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {paths.map((path, i) => (
            <div key={path} className="border hairline bg-[#F9F8F6]" data-testid={`${testIdPrefix}-item-${i}`}>
              <div className="relative aspect-[4/3] bg-[#E6E4DD] overflow-hidden">
                <img src={fileUrl(path)} alt="" className="absolute inset-0 w-full h-full object-cover" />
                {i === 0 && coverLabel && (
                  <span className="absolute top-1 left-1 font-mono text-[9px] tracking-widest uppercase text-[#F9F8F6] bg-[#1C2722]/80 px-1.5 py-0.5">
                    {coverLabel}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t hairline">
                <span className="inline-flex">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0}
                          className="p-1.5 hover:bg-[#E6E4DD] disabled:opacity-30" aria-label="Move picture earlier">
                    <ChevronLeft size={13} />
                  </button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === paths.length - 1}
                          className="p-1.5 hover:bg-[#E6E4DD] disabled:opacity-30" aria-label="Move picture later">
                    <ChevronRight size={13} />
                  </button>
                </span>
                <span className="font-mono text-[10px] text-[#7A857E]">{String(i + 1).padStart(2, "0")}</span>
                <button type="button" onClick={() => remove(i)}
                        className="p-1.5 hover:bg-[#E6E4DD]" style={{ color: "#B95438" }}
                        aria-label="Remove picture" data-testid={`${testIdPrefix}-remove-${i}`}>
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <label className="inline-flex items-center gap-2 cursor-pointer border hairline px-4 py-2 text-[12px] font-mono tracking-widest uppercase text-[#1C2722] bg-[#F9F8F6] hover:bg-[#E6E4DD] transition-colors">
        {busy > 0 ? <Loader2 className="animate-spin" size={14} /> : <ImagePlus size={14} />}
        {busy > 0 ? `Uploading — ${busy} left` : addLabel}
        <input
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={onPick}
          disabled={busy > 0}
          data-testid={`${testIdPrefix}-input`}
        />
      </label>
    </div>
  );
}
