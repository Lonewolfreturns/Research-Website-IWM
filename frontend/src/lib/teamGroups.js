import { Flame, Microscope, Cog, Landmark, GraduationCap, BookOpen, Users } from "lucide-react";

/**
 * Team members are grouped automatically from the free-text `role` an admin
 * types, so nobody has to maintain a separate ordering by hand.
 *
 * TIERS is in display order — most senior first — and doubles as the matcher:
 * the first tier whose pattern matches the role wins. That ordering is load
 * bearing. "Postdoctoral Fellow" contains the substring "doctoral", so the
 * postdoc tier MUST be tested before the doctoral one, or every postdoc lands
 * in with the PhD students. Same reasoning puts "Principal Investigator" first.
 */
export const TIERS = [
  {
    key: "principal-investigator",
    label: "Principal Investigator",
    blurb: "Visionary leadership and intellectual drive",
    Icon: Flame,
    match: /principal\s*investigator|\bp\.?\s?i\.?\b|lab\s*director/i,
  },
  {
    key: "postdoctoral",
    label: "Postdoctoral Fellows",
    blurb: "Advanced research and scientific inquiry",
    Icon: Microscope,
    match: /post[\s-]?doc/i,
  },
  {
    key: "technical",
    label: "Technical Staff",
    blurb: "Operational expertise and precision",
    Icon: Cog,
    match: /technician|technical|engineer|lab\s*manager|analyst|staff/i,
  },
  {
    key: "doctoral",
    label: "Doctoral Students",
    blurb: "Scholarly excellence and research prestige",
    Icon: Landmark,
    match: /ph\.?\s?d|doctoral|dphil/i,
  },
  {
    key: "masters",
    label: "Masters Students",
    blurb: "Academic achievement and specialization",
    Icon: GraduationCap,
    match: /master|m\.?\s?sc|mres|m\.?\s?eng/i,
  },
  {
    key: "undergraduate",
    label: "Undergraduate Students & Interns",
    blurb: "Foundational learning and curiosity",
    Icon: BookOpen,
    match: /undergrad|intern|b\.?\s?sc|honou?rs|co-?op/i,
  },
];

// Anything whose role doesn't match a tier still has to appear somewhere —
// silently dropping a person from the page would be far worse than a slightly
// vague heading.
export const FALLBACK_TIER = {
  key: "research-team",
  label: "Research Team",
  blurb: "",
  Icon: Users,
  match: null,
};

/** Every tier in display order, including the catch-all. */
export const ALL_TIERS = [...TIERS, FALLBACK_TIER];

/** Which tier does this role string belong to? Never returns null. */
export function tierForRole(role) {
  const text = String(role || "");
  return TIERS.find((t) => t.match.test(text)) || FALLBACK_TIER;
}

/**
 * The tier a member actually belongs to.
 *
 * An explicit `group` chosen in the admin always wins — guessing from free text
 * is a convenience, not a contract, and "Postdoc Fellow" vs "Post-doctoral
 * Researcher" shouldn't be the difference between right and wrong. Records
 * without a `group` (everything created before the field existed) fall back to
 * matching on the role, so nothing needs migrating.
 */
export function tierForMember(member) {
  const explicit = ALL_TIERS.find((t) => t.key === member?.group);
  return explicit || tierForRole(member?.role);
}

function isAlumni(member) {
  const v = member?.alumni;
  return v === true || v === 1 || v === "true";
}

const byOrder = (a, b) => (Number(a.display_order) || 0) - (Number(b.display_order) || 0);

/**
 * Split members into current and alumni, each bucketed into tiers and sorted by
 * the admin's display_order within a tier. Empty tiers are dropped.
 */
export function groupTeam(members = []) {
  const build = (people) =>
    ALL_TIERS.map((tier) => ({
      tier,
      members: people.filter((m) => tierForMember(m).key === tier.key).sort(byOrder),
    })).filter((g) => g.members.length > 0);

  return {
    current: build(members.filter((m) => !isAlumni(m))),
    alumni: build(members.filter(isAlumni)),
  };
}
