import React, { useState } from "react";
import { User } from "lucide-react";
import { fileUrl } from "../utils/api";
import SocialIcons from "./SocialIcons";

/**
 * Horizontal row layout: photo on the left, name/role/bio/social on the right.
 * Each researcher takes up one full row; rows stack vertically.
 */
export const TeamCard = ({ member, index = 0, badgeLabel = "Researcher" }) => {
  const [broken, setBroken] = useState(false);
  const src = member.image_path ? fileUrl(member.image_path) : null;
  const orderLabel = String(index + 1).padStart(2, "0");

  return (
    <article
      // Anchor target for /team#member-<id>, linked to from project credits.
      // scroll-mt clears the sticky navbar so the card isn't tucked under it.
      id={`member-${member.id}`}
      className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-0 border hairline bg-[#F9F8F6] fade-up scroll-mt-28"
      style={{ animationDelay: `${Math.min(index, 8) * 80}ms` }}
      data-testid={`team-card-${member.id}`}
    >
      {/* Photo */}
      <div className="relative aspect-[4/5] md:aspect-auto md:min-h-[420px] bg-[#E6E4DD] overflow-hidden">
        {src && !broken ? (
          <img
            src={src}
            alt={member.name}
            onError={() => setBroken(true)}
            className="absolute inset-0 w-full h-full object-cover grayscale-[18%] hover:grayscale-0 transition-all duration-700"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#7A857E]">
            <User size={48} strokeWidth={1} />
          </div>
        )}
        <div className="absolute top-3 left-3 font-mono text-[10px] tracking-widest uppercase text-[#F9F8F6] bg-[#1C2722]/80 px-2 py-1">
          {orderLabel} · {badgeLabel}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 lg:p-10 flex flex-col border-t md:border-t-0 md:border-l hairline">
        <div className="overline" data-testid={`team-role-${member.id}`}>{member.role}</div>
        <h3
          className="font-serif text-3xl md:text-4xl lg:text-[44px] leading-[1.05] tracking-tight text-[#1C2722] mt-2"
          data-testid={`team-name-${member.id}`}
        >
          {member.name}
        </h3>

        {member.bio && (
          <p
            className="mt-5 text-[14.5px] leading-relaxed text-[#4A5A52] max-w-2xl"
            data-testid={`team-bio-${member.id}`}
          >
            {member.bio}
          </p>
        )}

        <div className="mt-auto pt-8">
          <SocialIcons member={member} testIdPrefix="team-social" />
        </div>
      </div>
    </article>
  );
};

export default TeamCard;
