import React from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowUpRight, ArrowRight, Users, Handshake, Banknote, HeartHandshake } from "lucide-react";
import ImageCarousel from "./ImageCarousel";
import { hasStory, projectImages, splitNames, storyBlocks } from "../lib/projectStory";

/**
 * Turn any roster name appearing in a credit line into a link to that person's
 * card on the team page. The matching itself lives in lib/projectStory so the
 * story page credits the same people the same way.
 */
function linkNames(text, roster) {
  const segments = splitNames(text, roster);
  if (segments.length === 0) return "";
  if (!segments.some((s) => s.member)) return String(text || "");
  return segments.map((seg, i) =>
    seg.member ? (
      <Link
        key={i}
        to={`/team#member-${seg.member.id}`}
        className="ink-link text-[#1C2722] font-medium"
        data-testid={`project-person-link-${seg.member.id}`}
      >
        {seg.text}
      </Link>
    ) : (
      <React.Fragment key={i}>{seg.text}</React.Fragment>
    )
  );
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
  const images = projectImages(project);
  const orderLabel = String(index + 1).padStart(2, "0");
  const status = (project.status || "").trim();
  const tone = STATUS_TONE[status.toLowerCase()] || "#7A857E";
  // The card is a summary; the story is the long form. It only advertises
  // itself once there is something written there to read.
  const story = hasStory(project);
  const storyCount = storyBlocks(project).length;

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
      {/* Pictures */}
      <div className="relative aspect-[4/3] md:aspect-auto md:min-h-[340px] bg-[#E6E4DD] overflow-hidden">
        <ImageCarousel
          images={images}
          alt={project.title || "Project image"}
          className="absolute inset-0"
          imgClassName="grayscale-[15%] hover:grayscale-0"
          fallback={<FlaskConical size={44} strokeWidth={1} />}
          testIdPrefix={`project-images-${project.id}`}
        />
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
          {story ? (
            <Link to={`/projects/${project.id}`} className="hover:text-[#B95438] transition-colors">
              {project.title}
            </Link>
          ) : (
            project.title
          )}
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
          // Clamped only when there is a story to click through to — otherwise
          // the card is the only place this text appears and truncating it
          // would put the rest out of reach.
          <p
            className={`mt-4 text-[14.5px] leading-relaxed text-[#4A5A52] max-w-3xl whitespace-pre-line ${story ? "line-clamp-6" : ""}`}
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

        {(story || project.external_url) && (
          <div className="mt-auto pt-8 flex flex-wrap items-center gap-3">
            {story && (
              <Link
                to={`/projects/${project.id}`}
                className="btn-ink !py-2.5 !px-4"
                data-testid={`project-story-link-${project.id}`}
              >
                Read the full story <ArrowRight size={12} />
              </Link>
            )}
            {story && (
              <span className="overline" data-testid={`project-story-count-${project.id}`}>
                {storyCount} {storyCount === 1 ? "entry" : "entries"}
              </span>
            )}
            {project.external_url && (
              <a
                href={project.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-outline !py-2 !px-3"
                data-testid={`project-link-${project.id}`}
              >
                Project page <ArrowUpRight size={12} />
              </a>
            )}
          </div>
        )}
      </div>
    </article>
  );
};

export default ProjectCard;
