import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Loader2, AlertTriangle, ArrowLeft, ArrowUpRight, User,
  Users, Handshake, Banknote, HeartHandshake,
} from "lucide-react";
import { api, fileUrl } from "../utils/api";
import StoryBlocks from "../components/StoryBlocks";
import ImageCarousel from "../components/ImageCarousel";
import Lightbox from "../components/Lightbox";
import usePageMeta from "../hooks/usePageMeta";
import { hasStory, projectImages, projectMembers, splitNames, storyGalleryIds } from "../lib/projectStory";

const STATUS_TONE = { ongoing: "#B95438", completed: "#4A5A52", planned: "#7A857E" };

/** A credit line with every roster name in it linked to that person's card. */
function Credit({ text, roster, link }) {
  if (!link) return text;
  return splitNames(text, roster).map((seg, i) =>
    seg.member ? (
      <Link
        key={i}
        to={`/team#member-${seg.member.id}`}
        className="ink-link text-[#1C2722] font-medium"
        data-testid={`story-person-link-${seg.member.id}`}
      >
        {seg.text}
      </Link>
    ) : (
      <React.Fragment key={i}>{seg.text}</React.Fragment>
    )
  );
}

/** Small portrait + name + role, linking through to the team page. */
function PersonChip({ member }) {
  const [broken, setBroken] = useState(false);
  const src = member.image_path ? fileUrl(member.image_path) : null;
  return (
    <Link
      to={`/team#member-${member.id}`}
      className="group flex items-center gap-4 p-4 border-r border-b hairline hover:bg-[#F2EFEA] transition-colors"
      data-testid={`story-person-${member.id}`}
    >
      <div className="w-14 aspect-[4/5] shrink-0 bg-[#E6E4DD] overflow-hidden border hairline">
        {src && !broken ? (
          <img
            src={src}
            alt={member.name}
            onError={() => setBroken(true)}
            loading="lazy"
            className="w-full h-full object-cover object-[center_25%] grayscale-[18%] group-hover:grayscale-0 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[#7A857E]">
            <User size={18} strokeWidth={1} />
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-serif text-lg leading-tight text-[#1C2722] group-hover:text-[#B95438] transition-colors truncate">
          {member.name}
        </div>
        {member.role && <div className="overline mt-1 truncate">{member.role}</div>}
      </div>
    </Link>
  );
}

export default function ProjectStoryPage() {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [roster, setRoster] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lightboxIdx, setLightboxIdx] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // The roster and the gallery only decorate the story, so neither is
        // allowed to take the page down with it.
        const [projects, team, gal] = await Promise.all([
          api.get("/projects"),
          api.get("/team").catch(() => ({ data: [] })),
          api.get("/gallery").catch(() => ({ data: [] })),
        ]);
        if (cancelled) return;
        const found = (projects.data || []).find((p) => String(p.id) === String(id));
        if (!found) setError("That project could not be found.");
        setProject(found || null);
        setRoster(team.data || []);
        setGallery(gal.data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || "Failed to load this project.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  usePageMeta(
    project?.title || "Project",
    project?.summary || "A project from the Innovative Waste Management lab."
  );

  const galleryById = useMemo(
    () => Object.fromEntries((gallery || []).map((g) => [String(g.id), g])),
    [gallery]
  );

  // Only the figures this story actually cites go in the lightbox, so the
  // arrows walk the project's own pictures rather than the whole archive.
  const storyGallery = useMemo(() => {
    if (!project) return [];
    return storyGalleryIds(project).map((gid) => galleryById[gid]).filter(Boolean);
  }, [project, galleryById]);

  const people = useMemo(() => projectMembers(project, roster), [project, roster]);

  const openGallery = (gid) => {
    const idx = storyGallery.findIndex((g) => String(g.id) === String(gid));
    if (idx !== -1) setLightboxIdx(idx);
  };

  if (loading) {
    return (
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-32 flex items-center gap-3 text-[#4A5A52]" data-testid="story-loading">
        <Loader2 className="animate-spin" size={18} /> Loading project…
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-32 text-center" data-testid="story-error">
        <div className="overline mb-4 inline-flex items-center gap-2">
          <AlertTriangle size={12} /> Project
        </div>
        <h1 className="font-serif text-4xl text-[#1C2722]">{error || "Project not found."}</h1>
        <div className="mt-8">
          <Link to="/projects" className="btn-outline"><ArrowLeft size={14} /> All projects</Link>
        </div>
      </div>
    );
  }

  const status = (project.status || "").trim();
  const tone = STATUS_TONE[status.toLowerCase()] || "#7A857E";
  const images = projectImages(project);
  const credits = [
    { key: "people", label: "Who works on it", value: project.people, Icon: Users, link: true },
    { key: "partners", label: "Who else is involved", value: project.partners, Icon: Handshake, link: true },
    { key: "funding", label: "Funded by", value: project.funding, Icon: Banknote },
    { key: "sponsors", label: "Sponsors & contributions", value: project.sponsors, Icon: HeartHandshake },
  ].filter((c) => typeof c.value === "string" && c.value.trim().length > 0);

  return (
    <div data-testid="project-story-page">
      {/* Masthead */}
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-10 lg:py-16">
          <Link to="/projects" className="overline inline-flex items-center gap-2 hover:text-[#B95438] transition-colors" data-testid="story-back">
            <ArrowLeft size={12} /> All projects
          </Link>

          <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-8">
              <div className="flex flex-wrap items-center gap-3">
                {status && (
                  <span className="inline-flex items-center gap-2 border hairline px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase text-[#1C2722] bg-[#F2EFEA]" data-testid="story-status">
                    <span className="w-2 h-2" style={{ background: tone }} />
                    {status}
                  </span>
                )}
                {project.year && <span className="overline">{project.year}</span>}
              </div>
              <h1 className="mt-5 font-serif text-4xl md:text-5xl lg:text-[64px] leading-[1.02] tracking-tight text-[#1C2722]" data-testid="story-title">
                {project.title}
              </h1>
              {project.summary && (
                <p className="mt-6 font-serif text-xl md:text-2xl leading-relaxed text-[#4A5A52] max-w-3xl" data-testid="story-summary">
                  {project.summary}
                </p>
              )}
            </div>
            {images.length > 0 && (
              <div className="lg:col-span-4">
                <ImageCarousel
                  images={images}
                  alt={project.title}
                  loading="eager"
                  className="relative w-full aspect-[4/3] border hairline bg-[#E6E4DD] overflow-hidden"
                  testIdPrefix="story-images"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* The story */}
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-14 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-8">
            {project.description && (
              <p className="text-[16px] leading-[1.75] text-[#1C2722] max-w-3xl whitespace-pre-line" data-testid="story-description">
                {project.description}
              </p>
            )}

            {hasStory(project) ? (
              <div className={project.description ? "mt-10" : ""}>
                <StoryBlocks project={project} galleryById={galleryById} onOpenGallery={openGallery} />
              </div>
            ) : (
              !project.description && (
                <p className="text-[15px] text-[#4A5A52]" data-testid="story-empty">
                  This project&apos;s story hasn&apos;t been written up yet — it is added to as the
                  work goes on. Please check back.
                </p>
              )
            )}

            {project.external_url && (
              <div className="mt-12">
                <a
                  href={project.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline"
                  data-testid="story-external-link"
                >
                  Project page <ArrowUpRight size={12} />
                </a>
              </div>
            )}
          </div>

          {/* Who and what is behind it */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-28 space-y-10">
              {people.length > 0 && (
                <div data-testid="story-people-list">
                  <div className="overline mb-4">The people on it</div>
                  <div className="border-t border-l hairline grid grid-cols-1">
                    {people.map((m) => <PersonChip key={m.id} member={m} />)}
                  </div>
                </div>
              )}

              {credits.length > 0 && (
                <div>
                  <div className="overline mb-4">Credits</div>
                  <div className="border-t border-l hairline">
                    {credits.map(({ key, label, value, Icon, link }) => (
                      <div key={key} className="p-4 border-r border-b hairline" data-testid={`story-${key}`}>
                        <div className="overline inline-flex items-center gap-2 mb-2">
                          <Icon size={11} className="text-[#B95438]" /> {label}
                        </div>
                        <div className="text-[13.5px] leading-relaxed text-[#1C2722]">
                          <Credit text={value} roster={roster} link={link} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </section>

      {lightboxIdx != null && storyGallery.length > 0 && (
        <Lightbox
          items={storyGallery}
          index={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i == null ? null : (i - 1 + storyGallery.length) % storyGallery.length))}
          onNext={() => setLightboxIdx((i) => (i == null ? null : (i + 1) % storyGallery.length))}
        />
      )}
    </div>
  );
}
