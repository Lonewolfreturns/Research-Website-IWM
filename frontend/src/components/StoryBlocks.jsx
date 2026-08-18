import React from "react";
import { ArrowUpRight, Quote } from "lucide-react";
import { fileUrl } from "../utils/api";
import { blockImages, embedSrc, storyBlocks } from "../lib/projectStory";
import GalleryItemView from "./GalleryItem";
import ImageCarousel from "./ImageCarousel";

/**
 * Renders the blocks an admin has written onto a project, in order.
 *
 * Everything is set on one measure (max-w-3xl) except pictures, video and
 * gallery rows, which are allowed to run wider — the story should read like an
 * article with figures, not a slide deck.
 */
export const StoryBlocks = ({ project, galleryById = {}, onOpenGallery }) => {
  const blocks = storyBlocks(project);
  if (blocks.length === 0) return null;

  return (
    <div className="flex flex-col gap-10" data-testid="project-story">
      {blocks.map((b, i) => (
        <Block
          key={b.id || i}
          block={b}
          index={i}
          galleryById={galleryById}
          onOpenGallery={onOpenGallery}
        />
      ))}
    </div>
  );
};

const Caption = ({ text }) =>
  text ? (
    <figcaption className="mt-3 text-[12.5px] leading-relaxed text-[#4A5A52] max-w-3xl">
      {text}
    </figcaption>
  ) : null;

function Block({ block: b, index, galleryById, onOpenGallery }) {
  const testId = `story-block-${b.type}-${b.id || index}`;

  if (b.type === "heading") {
    return (
      <div className="pt-6 border-t hairline" data-testid={testId}>
        {b.date && <div className="overline mb-3">{b.date}</div>}
        <h2 className="font-serif text-3xl md:text-4xl leading-tight tracking-tight text-[#1C2722] max-w-3xl">
          {b.text}
        </h2>
      </div>
    );
  }

  if (b.type === "quote") {
    return (
      <blockquote className="border-l-2 border-[#B95438] pl-6 max-w-3xl" data-testid={testId}>
        <Quote size={16} className="text-[#B95438] mb-3" />
        <p className="font-serif text-2xl leading-relaxed text-[#1C2722]">{b.text}</p>
        {b.attribution && (
          <footer className="mt-4 overline">— {b.attribution}</footer>
        )}
      </blockquote>
    );
  }

  if (b.type === "image") {
    const images = blockImages(b);
    if (images.length === 0) return null;
    return (
      <figure data-testid={testId}>
        {images.length === 1 ? (
          // One picture keeps its own proportions — a figure shouldn't be
          // cropped to a shape it was never shot in.
          <img
            src={fileUrl(images[0])}
            alt={b.caption || "Project photograph"}
            loading="lazy"
            className="w-full h-auto border hairline bg-[#E6E4DD]"
          />
        ) : (
          // Several need one frame to sit in, or the page jumps as you page
          // through them. Contained rather than cropped, on the stone mat.
          <ImageCarousel
            images={images}
            alt={b.caption || "Project photograph"}
            objectFit="contain"
            className="relative w-full aspect-[3/2] border hairline bg-[#E6E4DD] overflow-hidden"
            testIdPrefix={`story-figure-${b.id || index}`}
          />
        )}
        <Caption text={b.caption} />
      </figure>
    );
  }

  if (b.type === "video") {
    return (
      <figure data-testid={testId}>
        <video
          src={fileUrl(b.path)}
          controls
          preload="metadata"
          className="w-full h-auto border hairline bg-[#1C2722]"
        />
        <Caption text={b.caption} />
      </figure>
    );
  }

  if (b.type === "embed") {
    const src = embedSrc(b.url);
    if (!src) return null;
    return (
      <figure data-testid={testId}>
        <div className="aspect-video border hairline bg-[#1C2722]">
          <iframe
            src={src}
            title={b.caption || "Embedded video"}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <Caption text={b.caption} />
      </figure>
    );
  }

  if (b.type === "link") {
    return (
      <div className="border hairline bg-[#F2EFEA] p-6 max-w-3xl" data-testid={testId}>
        <a
          href={b.url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-serif text-xl leading-snug text-[#1C2722] hover:text-[#B95438] transition-colors inline-flex items-start gap-2"
        >
          {b.label || b.url}
          <ArrowUpRight size={16} className="mt-1.5 shrink-0" />
        </a>
        {b.note && <p className="mt-2 text-[13.5px] text-[#4A5A52]">{b.note}</p>}
      </div>
    );
  }

  if (b.type === "gallery") {
    const items = (b.ids || []).map((id) => galleryById[String(id)]).filter(Boolean);
    if (items.length === 0) return null;
    return (
      <div data-testid={testId}>
        <div className="overline mb-4">From the gallery</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((it) => (
            <GalleryItemView key={it.id} item={it} onOpen={() => onOpenGallery?.(it.id)} />
          ))}
        </div>
      </div>
    );
  }

  // text — the default. whitespace-pre-line keeps the paragraph breaks the
  // admin typed without needing a block per paragraph.
  return (
    <p
      className="text-[16px] leading-[1.75] text-[#1C2722] max-w-3xl whitespace-pre-line"
      data-testid={testId}
    >
      {b.text}
    </p>
  );
}

export default StoryBlocks;
