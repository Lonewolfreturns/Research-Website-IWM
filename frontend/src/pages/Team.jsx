import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { Loader2, AlertTriangle, ChevronDown } from "lucide-react";
import { api } from "../utils/api";
import TeamCard from "../components/TeamCard";
import ContactSection from "../components/ContactSection";
import usePageMeta from "../hooks/usePageMeta";
import { groupTeam } from "../lib/teamGroups";

function TierBlock({ group, scope = "team", open, onToggle }) {
  const { tier, members } = group;
  const { Icon } = tier;
  const panelId = `${scope}-panel-${tier.key}`;

  return (
    <section data-testid={`${scope}-tier-${tier.key}`}>
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="w-full text-left flex items-center justify-between gap-4 flex-wrap border-b hairline pb-4 group"
          data-testid={`${scope}-toggle-${tier.key}`}
        >
          <span className="font-serif text-3xl md:text-4xl text-[#1C2722] tracking-tight inline-flex items-center gap-3 group-hover:text-[#B95438] transition-colors">
            <Icon size={22} strokeWidth={1.25} className="text-[#B95438] shrink-0" />
            {tier.label}
          </span>
          <span className="flex items-center gap-4">
            {tier.blurb && <span className="overline hidden lg:inline">{tier.blurb}</span>}
            <span className="font-mono text-[11px] tracking-widest text-[#7A857E]">
              {String(members.length).padStart(2, "0")}
            </span>
            <ChevronDown
              size={18}
              className={`text-[#4A5A52] shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </h2>

      {/* Rendered even when closed, just display:none'd: the cards stay in the
          HTML for crawlers, and a /team#member-<id> link still finds its target
          once the group opens.

          The display class has to be conditional. The `hidden` attribute alone
          does nothing here — `[hidden]{display:none}` in the UA stylesheet and
          Tailwind's `.flex` have the same specificity, and Tailwind's sheet
          loads later, so `flex` would win and the "collapsed" group would stay
          on screen. The attribute is kept for assistive tech. */}
      <div
        id={panelId}
        hidden={!open}
        className={`${open ? "flex" : "hidden"} flex-col gap-6 lg:gap-8 mt-8`}
      >
        {members.map((m, i) => (
          <TeamCard key={m.id} member={m} index={i} badgeLabel={tier.label} />
        ))}
      </div>
    </section>
  );
}

export default function TeamPage() {
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMeta(
    "Team",
    "The chemists, engineers, data scientists and field researchers behind the Innovative Waste Management lab."
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get("/team");
        if (!cancelled) setTeam(data || []);
      } catch (e) {
        if (!cancelled) setError(e?.response?.data?.detail || "Failed to load team.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { current, alumni } = useMemo(() => groupTeam(team), [team]);

  const keyFor = (scope, group) => `${scope}-${group.tier.key}`;
  const allKeys = useMemo(
    () => [...current.map((g) => keyFor("team", g)), ...alumni.map((g) => keyFor("alumni", g))],
    [current, alumni]
  );

  const { hash } = useLocation();

  /**
   * Which groups start open is *derived*, not stored: the most senior group,
   * plus whichever group holds the person a /team#member-<id> link points at.
   * State only holds the visitor's own expand/collapse choices.
   *
   * Two effects racing to seed the same piece of state is what broke this the
   * first time — whichever ran second clobbered the other. Deriving the default
   * removes the ordering question altogether.
   */
  const defaultOpen = useMemo(() => {
    const keys = new Set();
    if (current.length > 0) keys.add(keyFor("team", current[0]));
    if (hash) {
      const id = hash.slice(1);
      for (const [scope, groups] of [["team", current], ["alumni", alumni]]) {
        for (const g of groups) {
          if (g.members.some((m) => `member-${m.id}` === id)) keys.add(keyFor(scope, g));
        }
      }
    }
    return keys;
  }, [current, alumni, hash]);

  // null until the visitor touches a toggle, at which point their set wins.
  const [override, setOverride] = useState(null);
  const openKeys = override ?? defaultOpen;
  const setOpenKeys = setOverride;

  const isOpen = (key) => openKeys.has(key);
  const toggle = (key) =>
    setOpenKeys((prev) => {
      const next = new Set(prev ?? defaultOpen);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const allOpen = allKeys.length > 0 && allKeys.every(isOpen);
  const setAll = (open) => setOpenKeys(open ? new Set(allKeys) : new Set());

  useEffect(() => {
    if (!hash || loading || team.length === 0) return;
    let el;
    try {
      el = document.querySelector(hash);
    } catch {
      return; // a hash that isn't a valid selector
    }
    if (!el) return;
    // Still inside a collapsed group: it is in the DOM but display:none, so it
    // has no box to scroll to. The effect above is opening it; this re-runs when
    // openKeys changes and the card becomes visible.
    if (el.offsetParent === null) return;

    // Done synchronously rather than inside requestAnimationFrame: the cards are
    // already in the DOM by the time this effect runs, and rAF never fires at all
    // in a page that isn't rendering, which would drop the highlight entirely.
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("member-highlight");

    // Smooth scrolling is driven by the compositor and quietly does nothing in
    // some contexts (background tabs, headless, some embedded webviews). Landing
    // on the right card matters more than the animation, so confirm we actually
    // moved and jump outright if we didn't.
    // scroll-mt-28 on the card = 7rem, so a correct landing puts its top here.
    const SETTLED_TOP = 112;
    const settle = setTimeout(() => {
      const { top } = el.getBoundingClientRect();
      if (Math.abs(top - SETTLED_TOP) > 8) el.scrollIntoView({ block: "start" });
    }, 600);

    const clear = setTimeout(() => el.classList.remove("member-highlight"), 2400);
    return () => {
      clearTimeout(settle);
      clearTimeout(clear);
      el.classList.remove("member-highlight");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash, loading, team, openKeys]);

  return (
    <div data-testid="team-page">
      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="overline mb-4">§ Directory · Team</div>
            <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl leading-[0.98] text-[#1C2722] tracking-tight">
              The people doing the <em className="not-italic text-[#B95438]">slow, stubborn work</em> of waste research.
            </h1>
          </div>
          <div className="lg:col-span-5">
            <p className="text-[15px] leading-relaxed text-[#4A5A52] max-w-lg">
              A small, cross-disciplinary group — chemists, engineers, data scientists and field
              researchers — focused on moving waste from afterthought to infrastructure. Below,
              the current roster, ordered from the bench upward.
            </p>
          </div>
        </div>
      </section>

      <section className="border-b hairline">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-16 lg:py-20">
          {loading && (
            <div className="flex items-center gap-3 py-20 text-[#4A5A52]" data-testid="team-loading">
              <Loader2 className="animate-spin" size={18} /> Loading researchers…
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center gap-3 py-20 text-[#96402A]" data-testid="team-error">
              <AlertTriangle size={18} /> {error}
            </div>
          )}
          {!loading && !error && current.length === 0 && alumni.length === 0 && (
            <div className="py-20 text-[#4A5A52]" data-testid="team-empty">No team members yet.</div>
          )}

          {!loading && !error && current.length > 0 && (
            <>
              <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
                <div className="overline" data-testid="team-count">
                  {team.filter((m) => !(m.alumni === true || m.alumni === 1 || m.alumni === "true")).length} current members
                  {alumni.length > 0 && " · alumni below"}
                </div>
                <button
                  type="button"
                  onClick={() => setAll(!allOpen)}
                  className="btn-outline !py-2 !px-3"
                  data-testid="team-expand-all"
                >
                  {allOpen ? "Collapse all" : "Expand all"}
                </button>
              </div>
              <div className="flex flex-col gap-12 lg:gap-16" data-testid="team-grid">
                {current.map((group) => (
                  <TierBlock
                    key={group.tier.key}
                    group={group}
                    open={isOpen(keyFor("team", group))}
                    onToggle={() => toggle(keyFor("team", group))}
                  />
                ))}
              </div>
            </>
          )}

          {!loading && !error && alumni.length > 0 && (
            <div className="mt-24" data-testid="team-alumni">
              <div className="border-t hairline pt-10 mb-12">
                <div className="overline mb-3">§ Directory · Alumni</div>
                <h2 className="font-serif text-4xl md:text-5xl text-[#1C2722] tracking-tight">
                  Where people went next.
                </h2>
                <p className="mt-4 text-[15px] leading-relaxed text-[#4A5A52] max-w-xl">
                  Researchers who have since moved on. The work they did here is still part of the
                  record, so they stay on it.
                </p>
              </div>
              <div className="flex flex-col gap-12 lg:gap-16">
                {alumni.map((group) => (
                  <TierBlock
                    key={`alumni-${group.tier.key}`}
                    group={group}
                    scope="alumni"
                    open={isOpen(keyFor("alumni", group))}
                    onToggle={() => toggle(keyFor("alumni", group))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      <ContactSection testIdPrefix="team-contact" />
    </div>
  );
}
