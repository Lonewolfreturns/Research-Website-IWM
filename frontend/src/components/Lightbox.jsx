import React, { useEffect, useRef } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { fileUrl } from "../utils/api";

export const Lightbox = ({ items, index, onClose, onPrev, onNext }) => {
  const closeRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      else if (e.key === "ArrowLeft") onPrev?.();
      else if (e.key === "ArrowRight") onNext?.();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    // Move focus into the overlay so the keyboard shortcuts above have somewhere
    // sensible to return to, and Tab doesn't wander the page behind the dialog.
    const previouslyFocused = document.activeElement;
    closeRef.current?.focus();
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
    };
  }, [onClose, onPrev, onNext]);

  if (index == null || !items[index]) return null;
  const item = items[index];

  return (
    <div
      className="fixed inset-0 z-[60] bg-[#1C2722]/95 flex flex-col"
      data-testid="gallery-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={item.caption || `Gallery item ${index + 1} of ${items.length}`}
      onClick={onClose}
    >
      <div className="flex items-center justify-between px-6 py-4 text-[#F9F8F6] border-b border-white/10" onClick={(e) => e.stopPropagation()}>
        <div className="font-mono text-[11px] tracking-widest uppercase opacity-80">
          Figure {String(index + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
        </div>
        <button ref={closeRef} onClick={onClose} aria-label="Close" className="p-2 border border-white/20 hover:bg-white/10" data-testid="lightbox-close">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center relative p-6" onClick={(e) => e.stopPropagation()}>
        {items.length > 1 && (
          <button
            onClick={onPrev}
            aria-label="Previous"
            className="absolute left-4 top-1/2 -translate-y-1/2 text-[#F9F8F6] border border-white/20 p-3 hover:bg-white/10"
            data-testid="lightbox-prev"
          >
            <ChevronLeft />
          </button>
        )}

        <div className="max-w-[90vw] max-h-[80vh] w-full h-full flex items-center justify-center">
          {item.type === "image" && (
            <img src={fileUrl(item.file_path)} alt={item.caption || "Gallery item"} className="max-w-full max-h-[80vh] object-contain" />
          )}
          {item.type === "video" && (
            <video src={fileUrl(item.file_path)} controls className="max-w-full max-h-[80vh]" />
          )}
          {item.type === "embed" && (
            <div className="w-full max-w-[1100px] aspect-video">
              <iframe
                src={item.embed_url}
                title={item.caption || "Embedded video"}
                className="w-full h-full border-0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}
        </div>

        {items.length > 1 && (
          <button
            onClick={onNext}
            aria-label="Next"
            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#F9F8F6] border border-white/20 p-3 hover:bg-white/10"
            data-testid="lightbox-next"
          >
            <ChevronRight />
          </button>
        )}
      </div>

      {item.caption && (
        <div className="px-6 py-4 border-t border-white/10 text-[#F9F8F6]/90 text-sm font-serif" onClick={(e) => e.stopPropagation()}>
          {item.caption}
        </div>
      )}
    </div>
  );
};

export default Lightbox;
