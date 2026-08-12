import React, { useState } from "react";
import { Play, ExternalLink } from "lucide-react";
import { fileUrl } from "../utils/api";

export const GalleryItemView = ({ item, onOpen }) => {
  const [broken, setBroken] = useState(false);
  const figureCls =
    "group relative border hairline bg-[#F2EFEA] cursor-pointer overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B95438]";

  // The figure is the only way into the lightbox, so it has to behave like a
  // button for keyboard and screen-reader users, not just for the mouse.
  const openProps = {
    onClick: onOpen,
    onKeyDown: (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpen?.();
      }
    },
    role: "button",
    tabIndex: 0,
  };

  const Caption = ({ text, tag, icon }) => (
    <figcaption className="px-4 py-3 border-t hairline text-[12px] text-[#1C2722] flex items-center justify-between gap-3">
      <span className="line-clamp-2">{text}</span>
      <span className="overline shrink-0 inline-flex items-center gap-1">
        {tag}
        {icon}
      </span>
    </figcaption>
  );

  // ---- image ----
  if (item.type === "image") {
    return (
      <figure className={figureCls} {...openProps} aria-label={`Open ${item.caption || "gallery item"}`} data-testid={`gallery-item-${item.id}`}>
        {!broken ? (
          <img
            src={fileUrl(item.file_path)}
            alt={item.caption || "Gallery image"}
            onError={() => setBroken(true)}
            className="w-full h-auto block transition-transform duration-700 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full aspect-[4/3] flex items-center justify-center text-[#7A857E] text-sm">
            Image unavailable
          </div>
        )}
        <Caption text={item.caption || "Untitled"} tag="Fig" />
      </figure>
    );
  }

  // ---- video ----
  if (item.type === "video") {
    return (
      <figure className={figureCls} {...openProps} aria-label={`Open ${item.caption || "gallery item"}`} data-testid={`gallery-item-${item.id}`}>
        <div className="relative">
          <video
            src={fileUrl(item.file_path)}
            muted
            className="w-full h-auto block"
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-[#1C2722]/30 group-hover:bg-[#1C2722]/50 transition-colors">
            <div className="w-14 h-14 rounded-full bg-[#F9F8F6] flex items-center justify-center">
              <Play className="text-[#1C2722]" />
            </div>
          </div>
        </div>
        <Caption text={item.caption || "Untitled"} tag="Video" />
      </figure>
    );
  }

  // ---- embed ----
  return (
    <figure className={figureCls} {...openProps} aria-label={`Open ${item.caption || "gallery item"}`} data-testid={`gallery-item-${item.id}`}>
      <div className="relative aspect-video bg-[#1C2722]">
        <iframe
          src={item.embed_url}
          title={item.caption || "Embedded video"}
          className="w-full h-full border-0 pointer-events-none"
        />
        <div className="absolute inset-0 flex items-center justify-center bg-[#1C2722]/30 group-hover:bg-[#1C2722]/60 transition-colors">
          <div className="w-14 h-14 rounded-full bg-[#F9F8F6] flex items-center justify-center">
            <Play className="text-[#1C2722]" />
          </div>
        </div>
      </div>
      <Caption
        text={item.caption || "Embedded video"}
        tag="Embed"
        icon={<ExternalLink size={10} />}
      />
    </figure>
  );
};

export default GalleryItemView;