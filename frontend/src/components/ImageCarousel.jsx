import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fileUrl } from "../utils/api";

/**
 * A stack of pictures with arrows to walk through them.
 *
 * Every picture is rendered and cross-faded rather than swapped in on click, so
 * moving between them never shows a blank frame while the next one loads. It
 * does not advance on its own: this is reference material on a research site,
 * and a picture that moves while you are reading the caption is a nuisance.
 *
 * With a single picture it renders exactly what a bare <img> would — no arrows,
 * no counter — so it is safe to use everywhere a project picture appears.
 */
export const ImageCarousel = ({
  images = [],
  alt = "",
  className = "",
  imgClassName = "",
  objectFit = "cover",
  loading = "lazy",
  fallback = null,
  testIdPrefix = "carousel",
}) => {
  const [index, setIndex] = useState(0);
  const [broken, setBroken] = useState(() => new Set());

  // A shorter list (an admin removing a picture) must not strand the index past
  // the end.
  useEffect(() => {
    setIndex((i) => (i < images.length ? i : 0));
  }, [images.length]);

  const count = images.length;
  const go = (delta) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIndex((i) => (i + delta + count) % count);
  };

  if (count === 0) {
    return (
      <div className={className} data-testid={`${testIdPrefix}-empty`}>
        {fallback && (
          <div className="absolute inset-0 flex items-center justify-center text-[#7A857E]">
            {fallback}
          </div>
        )}
      </div>
    );
  }

  const fit = objectFit === "contain" ? "object-contain" : "object-cover";

  return (
    <div className={className} data-testid={`${testIdPrefix}-carousel`}>
      {images.map((path, i) => {
        const isBroken = broken.has(path);
        const current = i === index;
        return isBroken ? null : (
          <img
            key={path}
            src={fileUrl(path)}
            alt={count > 1 ? `${alt} — ${i + 1} of ${count}` : alt}
            loading={i === 0 ? loading : "lazy"}
            aria-hidden={!current}
            onError={() => setBroken((prev) => new Set(prev).add(path))}
            // filter rides along with opacity so a caller can add its own
            // grayscale-on-hover without fighting this transition.
            className={`absolute inset-0 w-full h-full ${fit} transition-[opacity,filter] duration-500 ${
              current ? "opacity-100" : "opacity-0 pointer-events-none"
            } ${imgClassName}`}
          />
        );
      })}

      {broken.size === count && fallback && (
        <div className="absolute inset-0 flex items-center justify-center text-[#7A857E]">
          {fallback}
        </div>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={go(-1)}
            aria-label="Previous picture"
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 border border-[#F9F8F6]/60 bg-[#1C2722]/60 text-[#F9F8F6] hover:bg-[#B95438] hover:border-[#B95438] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B95438]"
            data-testid={`${testIdPrefix}-prev`}
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={go(1)}
            aria-label="Next picture"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 border border-[#F9F8F6]/60 bg-[#1C2722]/60 text-[#F9F8F6] hover:bg-[#B95438] hover:border-[#B95438] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B95438]"
            data-testid={`${testIdPrefix}-next`}
          >
            <ChevronRight size={16} />
          </button>
          <div
            className="absolute bottom-3 right-3 font-mono text-[10px] tracking-widest uppercase text-[#F9F8F6] bg-[#1C2722]/80 px-2 py-1"
            data-testid={`${testIdPrefix}-counter`}
          >
            {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
          </div>
          {/* Announced rather than shown: the counter above is decorative, and a
              screen reader needs to be told the picture changed. */}
          <span className="sr-only" aria-live="polite">
            Picture {index + 1} of {count}
          </span>
        </>
      )}
    </div>
  );
};

export default ImageCarousel;
