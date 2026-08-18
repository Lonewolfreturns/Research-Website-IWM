import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Recycle, FlaskConical, Factory, Leaf, Sparkles, BookOpen, MapPin } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import usePageMeta from "../hooks/usePageMeta";

// The lab's four standing research lines, drawn from its published work and
// funded projects rather than invented for the page.
const INNOVATIONS = [
  { idx: "I", title: "Composting difficult feedstocks", body: "Aerobic systems for the wastes nobody else will take — Specified Risk Materials, abattoir and mink by-products, spent coffee grounds, and great whale mortalities.", icon: FlaskConical },
  { idx: "II", title: "Land-applied biosolids", body: "Two decades of field trials on what repeated municipal biosolid application does to soil chemistry, nitrogen dynamics and the organisms living in it.", icon: Factory },
  { idx: "III", title: "Emerging substances of concern", body: "Tracking pharmaceuticals, phthalates, triclosan and microplastics from treated biosolids into soils, crops and drainage water.", icon: Leaf },
  { idx: "IV", title: "Carbon recapture from organics", body: "Recovering the CO₂ and heat that composting throws away, and feeding them back into controlled-environment growing systems.", icon: Recycle },
];

const STATS = [
  { k: "40+", v: "Peer-reviewed publications" },
  { k: "19", v: "Researchers and students" },
  { k: "5", v: "Active research projects" },
  { k: "2007", v: "Established at Dalhousie" },
];

const WHY = [
  "Municipal solid waste volumes are on track to double by 2050.",
  "Linear economies leak an estimated 2.7 trillion USD in lost material value each year.",
  "Methane from poorly managed landfills already contributes 11% of anthropogenic greenhouse warming.",
  "Policy and industry move only as fast as the evidence — so we publish, openly.",
];

// Real papers, each linked to its DOI.
const HIGHLIGHTS = [
  {
    tag: "Paper · 2021",
    title: "A compost-based closed-loop cultivation approach for urban controlled environment agriculture.",
    src: "Sustainability",
    href: "https://doi.org/10.3390/su13052471",
  },
  {
    tag: "Paper · 2016",
    title: "Attitudes to the recovery and recycling of agricultural plastics waste: a case study of Nova Scotia.",
    src: "Resour. Conserv. Recycl.",
    href: "https://doi.org/10.1016/j.resconrec.2016.02.011",
  },
  {
    tag: "Paper · 2012",
    title: "Evaluation of an aerobic composting process for the management of Specified Risk Materials.",
    src: "J. Hazardous Materials",
    href: "https://doi.org/10.1016/j.jhazmat.2012.04.003",
  },
];

export default function Home() {
  const { settings: s } = useSettings();
  usePageMeta(
    "Introduction",
    "The Innovative Waste Management lab studies the science, systems and policy of turning the world's discards into a continuous supply of materials, energy and new livelihoods."
  );
  const locationLabel = [s.city, s.region, s.country].filter(Boolean).join(" · ");
  return (
    <div data-testid="home-page">
      {/* HERO */}
      <section className="border-b hairline relative overflow-hidden" data-testid="hero-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-10 lg:pt-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-end">
            <div className="lg:col-span-7">
              <div className="flex flex-wrap items-center gap-3 mb-6 fade-up">
                <span className="overline">Research group · Est. 2007</span>
                {locationLabel && (
                  <span className="inline-flex items-center gap-1.5 border hairline px-2.5 py-1 text-[10px] font-mono tracking-widest uppercase text-[#1C2722] bg-[#F2EFEA]" data-testid="hero-location">
                    <MapPin size={10} className="text-[#B95438]" /> {locationLabel}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-[48px] sm:text-6xl lg:text-[92px] leading-[0.95] tracking-tight text-[#1C2722] fade-up d-1">
                Turning waste <br />
                into the <em className="not-italic text-[#B95438]">infra&shy;structure</em> <br />
                of a circular future.
              </h1>
              <p className="mt-8 text-[16px] leading-relaxed text-[#4A5A52] max-w-xl fade-up d-2">
                The Innovative Waste Management lab studies the science, systems and policy of
                turning the world&apos;s discards into a continuous supply of materials,
                energy and new livelihoods.
              </p>
              <div className="mt-10 flex flex-wrap gap-4 fade-up d-3">
                <Link to="/projects" className="btn-ink" data-testid="hero-cta-research">
                  See our field work <ArrowRight size={14} />
                </Link>
                <Link to="/team" className="btn-outline" data-testid="hero-cta-team">
                  Meet the team
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5 relative">
              <div className="relative aspect-[4/5] border hairline overflow-hidden">
                <img
                  src="https://images.pexels.com/photos/9574456/pexels-photo-9574456.jpeg?auto=compress&cs=tinysrgb&w=1200"
                  alt="Researcher examining material sample"
                  className="w-full h-full object-cover grayscale-[15%]"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-[#1C2722]/85 text-[#F9F8F6] p-5">
                  <div className="overline text-[#E6E4DD]/80 mb-2">Ongoing project</div>
                  <div className="font-serif text-lg leading-tight">
                    Quantifying carbon footprints from source-separate organics facilities.
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-3 text-[11px] font-mono tracking-widest uppercase text-[#4A5A52]">
                <span className="inline-block w-2 h-2 bg-[#B95438]"></span> Field report · updated weekly
              </div>
            </div>
          </div>

          {/* ticker */}
          <div className="mt-16 py-5 border-t border-b hairline overflow-hidden">
            {/* Two identical copies; each carries its own trailing gap so the
                -50% translate lands exactly one copy over and the loop is seamless. */}
            <div className="flex ticker whitespace-nowrap font-serif text-2xl text-[#1C2722]" aria-hidden="true">
              {[...Array(2)].map((_, n) => (
                <div key={n} className="flex gap-16 pr-16">
                  <span>Circular materials</span><span className="text-[#B95438]">·</span>
                  <span>Zero-emission processing</span><span className="text-[#B95438]">·</span>
                  <span>Policy & informal sector</span><span className="text-[#B95438]">·</span>
                  <span>Bio-derived polymers</span><span className="text-[#B95438]">·</span>
                  <span>Urban metabolism</span><span className="text-[#B95438]">·</span>
                  <span>Open datasets</span><span className="text-[#B95438]">·</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS IWM */}
      <section className="border-b hairline" data-testid="what-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="overline mb-4">§ 01 · Premise</div>
            <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] text-[#1C2722] tracking-tight">
              What is Innovative Waste Management?
            </h2>
          </div>
          <div className="lg:col-span-8">
            <p className="font-serif text-xl md:text-2xl leading-relaxed text-[#1C2722]">
              A discipline that treats waste not as an endpoint but as a mis-routed material — and
              asks: what policies, what machines, and what new chemistries would be required to put
              every gram of it back to use? <span className="text-[#B95438]">IWM</span> is both the
              method and the movement.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 mt-12 border-t border-l hairline">
              {STATS.map((s) => (
                <div key={s.v} className="p-6 border-r border-b hairline">
                  <div className="font-serif text-4xl text-[#1C2722]" data-testid="home-stat-value">{s.k}</div>
                  <div className="overline mt-2">{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY IT MATTERS */}
      <section className="border-b hairline bg-[#F2EFEA]" data-testid="why-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-5">
            <div className="overline mb-4">§ 02 · Urgency</div>
            <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] text-[#1C2722] tracking-tight">
              Why this matters — and why now.
            </h2>
            <div className="mt-6 border hairline p-6 bg-[#F9F8F6]">
              <Sparkles size={18} className="text-[#B95438]" />
              <p className="mt-3 text-[15px] text-[#1C2722] leading-relaxed">
                Every percentage point of waste we recover is a percentage point we don&apos;t have to
                mine, fell, or drill. Waste is climate work.
              </p>
            </div>
          </div>
          <div className="lg:col-span-7">
            <ol className="hairline-y border hairline bg-[#F9F8F6]">
              {WHY.map((w, i) => (
                <li key={i} className="grid grid-cols-[60px_1fr] items-start gap-6 p-6">
                  <span className="font-mono text-xs tracking-widest text-[#7A857E]">{String(i + 1).padStart(2, "0")}</span>
                  <span className="font-serif text-xl leading-snug text-[#1C2722]">{w}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* KEY INNOVATIONS */}
      <section className="border-b hairline" data-testid="innovations-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
          <div className="flex items-end justify-between flex-wrap gap-4 mb-12">
            <div>
              <div className="overline mb-4">§ 03 · Portfolio</div>
              <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] text-[#1C2722] tracking-tight max-w-xl">
                Four innovations currently shaping the field.
              </h2>
            </div>
            <Link to="/publications" className="btn-outline" data-testid="innovations-cta-publications">
              Read the papers <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l hairline">
            {INNOVATIONS.map((inn) => {
              const Icon = inn.icon;
              return (
                <article key={inn.title} className="p-8 lg:p-10 border-r border-b hairline group hover:bg-[#F2EFEA] transition-colors" data-testid={`innovation-card-${inn.idx}`}>
                  <div className="flex items-center justify-between mb-8">
                    <span className="overline">Innovation · {inn.idx}</span>
                    <Icon size={22} strokeWidth={1.25} className="text-[#B95438]" />
                  </div>
                  <h3 className="font-serif text-3xl leading-tight text-[#1C2722] tracking-tight">{inn.title}</h3>
                  <p className="mt-4 text-[15px] text-[#4A5A52] leading-relaxed">{inn.body}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b hairline bg-[#1C2722] text-[#F9F8F6]" data-testid="benefits-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24 grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4">
            <div className="overline mb-4" style={{ color: "#D1CEC7" }}>§ 04 · Outcomes</div>
            <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] tracking-tight">
              What the work unlocks.
            </h2>
            <p className="mt-6 text-[15px] leading-relaxed text-[#D1CEC7] max-w-sm">
              Every project is measured against three outcomes. If it doesn&apos;t move one of them,
              it doesn&apos;t leave the whiteboard.
            </p>
          </div>
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 border-t border-l border-white/10">
            {[
              { k: "Planetary", v: "Measurable reductions in landfill, leachate, and lifecycle CO₂e." },
              { k: "Economic", v: "Recovered-material markets that pay informal-sector workers fairly." },
              { k: "Civic", v: "Policy tools that cities can adopt without new infrastructure." },
            ].map((b) => (
              <div key={b.k} className="p-8 border-r border-b border-white/10">
                <div className="font-serif text-2xl text-[#F9F8F6]">{b.k}</div>
                <p className="mt-3 text-[14px] text-[#D1CEC7] leading-relaxed">{b.v}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESEARCH HIGHLIGHTS */}
      <section className="border-b hairline" data-testid="highlights-section">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-24">
          <div className="overline mb-4">§ 05 · Highlights</div>
          <h2 className="font-serif text-4xl md:text-5xl leading-[1.05] text-[#1C2722] tracking-tight max-w-2xl">
            Recent work, open for reading and reuse.
          </h2>

          <div className="mt-12 border-t hairline hairline-y">
            {HIGHLIGHTS.map((h, i) => (
              <article key={i} className="grid grid-cols-1 md:grid-cols-12 gap-6 py-8 group" data-testid={`highlight-${i}`}>
                <div className="md:col-span-2">
                  <span className="font-mono text-[11px] tracking-widest uppercase text-[#B95438]">{h.tag}</span>
                </div>
                <div className="md:col-span-8">
                  <h3 className="font-serif text-2xl md:text-3xl leading-snug text-[#1C2722] group-hover:text-[#B95438] transition-colors">
                    {h.href ? (
                      <a href={h.href} target="_blank" rel="noopener noreferrer" data-testid={`highlight-link-${i}`}>
                        {h.title}
                      </a>
                    ) : (
                      h.title
                    )}
                  </h3>
                </div>
                <div className="md:col-span-2 flex md:justify-end items-start">
                  <span className="font-mono text-[11px] tracking-widest uppercase text-[#7A857E] flex items-center gap-1">
                    <BookOpen size={12} /> {h.src}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
