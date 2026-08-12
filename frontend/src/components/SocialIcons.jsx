import React from "react";
import { Mail, Globe, Linkedin, Twitter, Github, GraduationCap, Facebook } from "lucide-react";

// Map of field key → { icon, label, hrefBuilder }
const CONFIG = {
  website:  { Icon: Globe,         label: "Website"         },
  email:    { Icon: Mail,          label: "Email"           },
  linkedin: { Icon: Linkedin,      label: "LinkedIn"        },
  twitter:  { Icon: Twitter,       label: "X / Twitter"     },
  github:   { Icon: Github,        label: "GitHub"          },
  scholar:  { Icon: GraduationCap, label: "Google Scholar"  },
  facebook: { Icon: Facebook,      label: "Facebook"        },
};

// Exported so admin forms/tests can share the same ordered list.
export const SOCIAL_ORDER = ["website", "email", "scholar", "facebook", "linkedin", "twitter", "github"];

function buildHref(key, value) {
  if (!value) return null;
  const v = String(value).trim();
  if (!v) return null;
  if (key === "email") {
    // accept raw address OR mailto:
    return v.startsWith("mailto:") ? v : `mailto:${v}`;
  }
  return /^https?:\/\//i.test(v) ? v : `https://${v}`;
}

export default function SocialIcons({ member, size = 16, className = "", testIdPrefix = "social" }) {
  if (!member) return null;
  const present = SOCIAL_ORDER.filter((k) => {
    const v = member[k];
    return typeof v === "string" && v.trim().length > 0;
  });
  if (present.length === 0) return null;
  return (
    <ul className={`flex flex-wrap items-center gap-2 ${className}`} data-testid={`${testIdPrefix}-list-${member.id ?? "x"}`}>
      {present.map((k) => {
        const { Icon, label } = CONFIG[k];
        const href = buildHref(k, member[k]);
        const isMail = k === "email";
        return (
          <li key={k}>
            <a
              href={href}
              target={isMail ? undefined : "_blank"}
              rel={isMail ? undefined : "noopener noreferrer"}
              aria-label={label}
              title={label}
              className="inline-flex items-center justify-center w-9 h-9 border hairline text-[#1C2722] hover:text-[#F9F8F6] hover:bg-[#1C2722] transition-colors"
              data-testid={`${testIdPrefix}-${k}-${member.id ?? "x"}`}
            >
              <Icon size={size} strokeWidth={1.5} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
