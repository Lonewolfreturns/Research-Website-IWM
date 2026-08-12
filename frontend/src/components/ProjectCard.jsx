import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowUpRight, Users, Handshake, Banknote, HeartHandshake } from "lucide-react";
import { fileUrl } from "../utils/api";

/**
 * Turn any roster name appearing in a credit line into a link to that person's
 * card on the team page.
 *
 * Scans for names rather than splitting on commas, so "Gordon Price and Akash
 * Kolla" links both, and text that isn't a person ("two MSc students") is left
 * alone. Longest names are tried first: with both "Sam" and "Sam Oyelaran" on
 * the roster, matching the short one first would leave a stray "Oyelaran".
 */
function linkNames(text, roster) {
  const raw = String(text || "");
  const names = (roster || [])
    .filter((m) => m?.id && typeof m.name === "string" && m.name.trim())
    .map((m) => ({ id: m.id, name: m.name.trim() }))
    .sort((a, b) => b.name.length - a.name.length);
  if (names.length === 0) return raw;

  const nodes = [];
  let rest = raw;
  let key = 0;
  while (rest) {
    let hit = null;
    for (const n of names) {
      const idx = rest.toLowerCase().indexOf(n.name.toLowerCase());
      if (idx !== -1 && (hit === null || idx < hit.idx)) hit = { idx, n };
    }
    if (!hit) { nodes.push(rest); break; }
    if (hit.idx > 0) nodes.push(rest.slice(0, hit.idx));
    // Slice from the original so the credit keeps whatever capitalisation the
    // admin typed, rather than echoing the roster spelling back.
    const label = rest.slice(hit.idx, hit.idx + hit.n.name.length);
    nodes.push(
      <Link
        key={`n${key++}`}
        to={`/team#member-${hit.n.id}`}
        className="ink-link text-[#1C2722] font-medium"
        data-testid={`project-person-link-${hit.n.id}`}
      >
        {label}
      </Link>
    );
    rest = rest.slice(hit.idx + hit.n.name.length);
  }
  return nodes;
}

// Status → dot colour. Anything unrecognised falls back to the muted ink tone.
const STATUS_TONE = {
  ongoing: "#B95438",
  completed: "#4A5A52",
  planned: "#7A857E",
};

/**
 * One project per row: picture on the left, the write-up on the right, and the
 * attribution (who works on it, who else is involved, who funds it, who
 * sponsors it) in a hairline grid underneath.
 */
export const ProjectCard = ({ project, index = 0, roster = [] }) => {
  const [broken, setBroken] = useState(false);
  const src = project.image_path ? fileUrl(project.image_path) : null;
  const orderLabel = String(index + 1).padStart(2, "0");
  const status = (project.status || "").trim();
  const tone = STATUS_TONE[status.toLowerCase()] || "#7A857E";

  const credits = [
    { key: "people", label: "Who works on it", value: project.people, Icon: Users, linkPeople: true },
    { key: "partners", label: "Who else is involved", value: project.partners, Icon: Handshake },
    { key: "funding", label: "Funded by", value: project.funding, Icon: Banknote },
    { key: "sponsors", label: "Sponsors & contributions", value: project.sponsors, Icon: HeartHandshake },
  ].filter((c) => typeof c.value === "string" && c.value.trim().length > 0);

  return (
    <article
      className="grid grid-cols-1 md:grid-cols-[420px_1fr] gap-0 border hairline bg-[#F9F8F6] fade-up"
      style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
      data-testid={`project-card-${project.id}`}
    >
      {/* Picture */}
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[340px] bg-[#E6E4DD] overflow-hidden">
        {src && !broken ? (
          <img
            src={src}
            alt={project.title || "Project image"}
            onError={() => setBroken(true)}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover grayscale-[15%] hover:grayscale-0 transition-all duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#7A857E]">
            <FlaskConical size={44} strokeWidth={1} />
          </div>
        )}
        <div className="absolute top-3 left-3 font-mono text-[10px] tracking-widest uppercase text-[#F9F8F6] bg-[#1C2722]/80 px-2 py-1">
          Project · {orderLabel}
        </div>
      </div>

      {/* Write-up */}
      <div className="p-6 md:p-8 lg:p-10 flex flex-col border-t md:border-t-0 md:border-l hairline">
        <div className="flex flex-wrap items-center gap-3">
          {status && (
            <span
              className="inline-flex items-center gap-2 border hairline px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase text-[#1C2722] bg-[#F2EFEA]"
              data-testid={`project-status-${project.id}`}
            >
              <span className="w-2 h-2" style={{ background: tone }} />
              {status}
            </span>
          )}
          {project.year && (
            <span className="overline" data-testid={`project-year-${project.id}`}>{project.year}</span>
          )}
        </div>

        <h3
          className="font-serif text-3xl md:text-4xl leading-[1.08] tracking-tight text-[#1C2722] mt-4"
          data-testid={`project-title-${project.id}`}
        >
          {project.title}
        </h3>

        {project.summary && (
          <p
            className="mt-4 font-serif text-xl leading-relaxed text-[#1C2722] max-w-3xl"
            data-testid={`project-summary-${project.id}`}
          >
            {project.summary}
          </p>
        )}

        {project.description && (
          <p
            className="mt-4 text-[14.5px] leading-relaxed text-[#4A5A52] max-w-3xl whitespace-pre-line"
            data-testid={`project-description-${project.id}`}
          >
            {project.description}
          </p>
        )}

        {credits.length > 0 && (
          <div className="mt-8 border-t border-l hairline grid grid-cols-1 sm:grid-cols-2">
            {credits.map(({ key, label, value, Icon, linkPeople }) => (
              <div key={key} className="p-4 border-r border-b hairline" data-testid={`project-${key}-${project.id}`}>
                <div className="overline inline-flex items-center gap-2 mb-2">
                  <Icon size={11} className="text-[#B95438]" /> {label}
                </div>
                <div className="text-[13.5px] leading-relaxed text-[#1C2722]">
                  {linkPeople ? linkNames(value, roster) : value}
                </div>
              </div>
            ))}
          </div>
        )}

        {project.external_url && (
          <div className="mt-auto pt-8">
            <a
              href={project.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-outline !py-2 !px-3"
              data-testid={`project-link-${project.id}`}
            >
              Project page <ArrowUpRight size={12} />
            </a>
          </div>
        )}
      </div>
    </article>
  );
};

export default ProjectCard;
