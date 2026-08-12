import React, { useRef, useState } from "react";
import { Loader2, Paperclip, Send, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { API_BASE } from "../utils/api";

const ALLOWED = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf", "text/plain", "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "video/mp4", "video/webm", "video/quicktime",
];
const MAX_MB = 10;

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const ContactForm = ({ variant = "full", testIdPrefix = "contact" }) => {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [status, setStatus] = useState({ state: "idle", msg: "" });
  const fileRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const onFileChange = (e) => {
    const f = e.target.files?.[0];
    setFileError("");
    if (!f) { setFile(null); return; }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`File must be ≤ ${MAX_MB}MB`);
      e.target.value = "";
      return;
    }
    if (!ALLOWED.includes(f.type) && f.type !== "") {
      setFileError("Unsupported file type");
      e.target.value = "";
      return;
    }
    setFile(f);
  };

  const clearFile = () => {
    setFile(null);
    setFileError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setStatus({ state: "idle", msg: "" });

    if (!form.name.trim()) return setStatus({ state: "error", msg: "Please enter your name." });
    if (!validateEmail(form.email.trim())) return setStatus({ state: "error", msg: "Please enter a valid email address." });
    if (!form.subject.trim()) return setStatus({ state: "error", msg: "Please enter a subject." });
    if (!form.message.trim() || form.message.trim().length < 5) {
      return setStatus({ state: "error", msg: "Message should be at least 5 characters." });
    }
    if (fileError) return;

    setStatus({ state: "loading", msg: "" });
    try {
      const fd = new FormData();
      fd.append("name", form.name.trim());
      fd.append("email", form.email.trim());
      fd.append("subject", form.subject.trim());
      fd.append("message", form.message.trim());
      // Tells the recipient which page the enquiry came from — the same form is
      // mounted at the foot of every public page.
      fd.append("page", window.location.pathname);
      if (file) fd.append("file", file);
      const res = await fetch(`${API_BASE}/contact`, { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`);
      setStatus({ state: "success", msg: data?.message || "Thank you — your message has been sent." });
      setForm({ name: "", email: "", subject: "", message: "" });
      clearFile();
    } catch (err) {
      setStatus({ state: "error", msg: err?.message || "Something went wrong. Please try again." });
    }
  };

  const compact = variant === "compact";

  return (
    <form
      onSubmit={onSubmit}
      className="w-full"
      data-testid={`${testIdPrefix}-form`}
      noValidate
    >
      <div className={`grid gap-4 ${compact ? "md:grid-cols-2" : "md:grid-cols-2"}`}>
        <label className="block">
          <span className="overline block mb-2">Name</span>
          <input
            type="text"
            value={form.name}
            onChange={set("name")}
            className="field"
            placeholder="Your name"
            data-testid={`${testIdPrefix}-input-name`}
            required
          />
        </label>
        <label className="block">
          <span className="overline block mb-2">Email</span>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            className="field"
            placeholder="you@example.org"
            data-testid={`${testIdPrefix}-input-email`}
            required
          />
        </label>
      </div>

      <label className="block mt-4">
        <span className="overline block mb-2">Subject</span>
        <input
          type="text"
          value={form.subject}
          onChange={set("subject")}
          className="field"
          placeholder="Collaboration enquiry, press, grant…"
          data-testid={`${testIdPrefix}-input-subject`}
          required
        />
      </label>

      <label className="block mt-4">
        <span className="overline block mb-2">Message</span>
        <textarea
          rows={compact ? 4 : 6}
          value={form.message}
          onChange={set("message")}
          className="field"
          placeholder="Tell us about your project, question, or proposal…"
          data-testid={`${testIdPrefix}-input-message`}
          required
        />
      </label>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 cursor-pointer border hairline px-4 py-2 text-[12px] font-mono tracking-widest uppercase text-[#1C2722] hover:bg-[#E6E4DD] transition-colors">
          <Paperclip size={14} />
          <span>{file ? "Change file" : "Attach file"}</span>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept={ALLOWED.join(",")}
            onChange={onFileChange}
            data-testid={`${testIdPrefix}-input-file`}
          />
        </label>
        {file && (
          <span className="inline-flex items-center gap-2 text-[12px] font-mono text-[#1C2722] border hairline px-3 py-2" data-testid={`${testIdPrefix}-file-chip`}>
            {file.name} · {(file.size / (1024 * 1024)).toFixed(2)}MB
            <button type="button" onClick={clearFile} aria-label="Remove file" className="ml-1 text-[#4A5A52] hover:text-[#B95438]">
              <X size={14} />
            </button>
          </span>
        )}
        {fileError && (
          <span className="text-[12px] text-[#B95438]" data-testid={`${testIdPrefix}-file-error`}>{fileError}</span>
        )}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="submit"
          className="btn-terracotta disabled:opacity-60"
          disabled={status.state === "loading"}
          data-testid={`${testIdPrefix}-submit-button`}
        >
          {status.state === "loading" ? (
            <><Loader2 className="animate-spin" size={14} /> Sending</>
          ) : (
            <>Send message <Send size={14} /></>
          )}
        </button>

        {status.state === "success" && (
          <div
            role="status"
            className="flex items-center gap-2 border hairline px-3 py-2 text-[13px] text-[#1C2722] bg-[#EFEBE2]"
            data-testid={`${testIdPrefix}-success`}
          >
            <CheckCircle2 size={16} className="text-[#4A5A52]" />
            {status.msg}
          </div>
        )}
        {status.state === "error" && (
          <div
            role="alert"
            className="flex items-center gap-2 border px-3 py-2 text-[13px] text-[#96402A]"
            style={{ borderColor: "#B95438", background: "#FBEFEA" }}
            data-testid={`${testIdPrefix}-error`}
          >
            <AlertTriangle size={16} />
            {status.msg}
          </div>
        )}
      </div>
    </form>
  );
};

export default ContactForm;
