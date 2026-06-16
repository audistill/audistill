import { BrewCommand } from "./brew-command";
import { GitHubStars } from "@/components/github-stars";

export default function Home() {
  return (
    <>
      <Hero />
      <Pipeline />
      <FeatureGrid />
      <UseCases />
      <Pricing />
      <OpenSource />
      <FAQ />
      <Install />
    </>
  );
}


/* ─── Hero ────────────────────────────────────────────────────── */

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 relative overflow-hidden mesh-hero">
      {/* Geometric rings */}
      <div className="geo-ring geo-ring-lg top-[-200px] left-[-150px] animate-float-slow" />
      <div className="geo-ring geo-ring-md top-[100px] right-[-100px] animate-float-delay" />
      <div className="geo-ring geo-ring-sm bottom-[100px] left-[10%] animate-float" />

      {/* Dot grid background */}
      <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />

      {/* Floating accent orbs */}
      <div className="absolute top-40 left-[15%] w-2 h-2 rounded-full bg-accent/30 animate-float blur-[1px]" />
      <div className="absolute top-60 right-[20%] w-1.5 h-1.5 rounded-full bg-accent/20 animate-float-delay blur-[1px]" />
      <div className="absolute top-80 left-[60%] w-1 h-1 rounded-full bg-accent/40 animate-float-slow" />

      <div className="max-w-4xl mx-auto text-center relative">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 bg-surface/80 backdrop-blur border border-border rounded-full px-3.5 py-1.5 mb-8 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]">
          <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(217,119,87,0.6)] pulse-soft" />
          <span className="text-xs text-secondary font-medium">Runs entirely on your Mac</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-heading)] text-[clamp(40px,6vw,68px)] font-bold leading-[1.05] tracking-[-0.02em] mb-5">
          Your audio,{" "}
          <span className="shimmer-accent text-transparent">distilled.</span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up delay-200 text-lg text-secondary max-w-xl mx-auto leading-relaxed mb-3">
          Transcribe, summarize, and search everything you&apos;ve heard — locally, in minutes.
        </p>
        <p className="animate-fade-up delay-200 text-sm text-stone mb-10">
          Your machine. Your models. Your knowledge base.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-300 flex flex-col items-center justify-center gap-4 mb-16">
          <a
            href="#install"
            className="bg-accent hover:bg-accent-hover active:bg-accent-pressed text-text text-sm font-medium px-8 py-3.5 rounded-[12px] transition-all duration-200 shadow-[0_2px_12px_rgba(217,119,87,0.25),0_4px_24px_rgba(217,119,87,0.15)] hover:shadow-[0_4px_20px_rgba(217,119,87,0.35),0_8px_40px_rgba(217,119,87,0.2)] hover:translate-y-[-1px]"
          >
            Download for Mac
          </a>
          <div className="flex items-center gap-3">
            <BrewCommand />
          </div>
          <GitHubStars fallbackText="Open Source" className="text-[12px] opacity-70 hover:opacity-100" />
        </div>

        {/* App Screenshot with window chrome */}
        <div className="animate-fade-up delay-400 relative mx-auto max-w-3xl">
          {/* Glow behind the window */}
          <div className="absolute inset-4 bg-accent/[0.06] rounded-[20px] blur-[40px]" />

          <div className="relative glow-warm rounded-[16px]">
            <div className="bg-surface border border-border rounded-[16px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.02)]">
              {/* Window titlebar */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-gradient-to-b from-surface-raised/80 to-surface/80">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                </div>
                <span className="ml-3 text-[11px] text-stone font-[family-name:var(--font-mono)]">Audistill</span>
              </div>
              {/* Screenshot area */}
              <div className="aspect-[16/10] bg-bg-deep diagonal-lines flex items-center justify-center relative">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-deep/50" />
                <div className="text-stone/40 text-sm font-[family-name:var(--font-mono)] relative">
                  [ App Screenshot ]
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Pipeline / How it Works — Flowing Pipeline ─────────────── */

function Pipeline() {
  return (
    <section className="px-6 py-28 relative section-glow overflow-hidden">
      <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-20">
          <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
            How it works
          </h2>
          <p className="text-secondary">Three steps. No complexity.</p>
        </div>

        {/* Pipeline layout — horizontal on desktop, vertical on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-y-4 md:gap-y-0">

          {/* ─── Step 1: Drop it in ─── */}
          <div className="pipeline-step pipeline-step-1 relative group">
            <div className="bg-surface/80 border border-border rounded-[16px] p-6 transition-all duration-500 hover:border-accent/25 hover:shadow-[0_8px_32px_rgba(217,119,87,0.08)] relative overflow-hidden">
              {/* Decorative corner accent */}
              <div className="absolute top-0 right-0 w-20 h-20 bg-accent/[0.04] rounded-full blur-[30px] group-hover:bg-accent/[0.08] transition-all duration-500" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center shadow-[0_0_16px_rgba(217,119,87,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent/60 uppercase tracking-[0.15em]">Input</span>
                </div>

                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2.5">
                  Drop it in
                </h3>
                <p className="text-[13px] text-secondary leading-relaxed mb-5">
                  Files, YouTube links, RSS feeds, or paste a URL.
                </p>

                {/* Mini visual: source type pills */}
                <div className="flex flex-wrap gap-1.5">
                  {["MP3", "YouTube", "RSS", "URL"].map((source) => (
                    <span key={source} className="text-[10px] font-[family-name:var(--font-mono)] text-stone bg-bg/80 px-2.5 py-1 rounded-[6px] border border-border">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ─── Connector 1→2 ─── */}
          <div className="hidden md:flex items-center justify-center px-2">
            <div className="relative w-12 h-[3px]">
              {/* Track */}
              <div className="absolute inset-0 bg-gradient-to-r from-border to-accent/20 rounded-full" />
              {/* Animated particles */}
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/60 shadow-[0_0_8px_rgba(217,119,87,0.5)] pipeline-particle" />
              <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/40 shadow-[0_0_6px_rgba(217,119,87,0.3)] pipeline-particle-2" />
            </div>
          </div>
          {/* Mobile connector */}
          <div className="flex md:hidden justify-center">
            <div className="relative w-[3px] h-8">
              <div className="absolute inset-0 bg-gradient-to-b from-border to-accent/20 rounded-full" />
              <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent/60 shadow-[0_0_8px_rgba(217,119,87,0.5)] pipeline-particle-v" />
            </div>
          </div>

          {/* ─── Step 2: Distill it (THE CORE — visually emphasized) ─── */}
          <div className="pipeline-step pipeline-step-2 relative group">
            <div className="bg-surface/90 border border-accent/20 rounded-[16px] p-6 transition-all duration-500 hover:border-accent/35 hover:shadow-[0_12px_48px_rgba(217,119,87,0.12)] relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.15)]">
              {/* Central glow — this step is the transformation */}
              <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.06] via-transparent to-accent/[0.03] pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-accent/[0.06] rounded-full blur-[40px] group-hover:w-40 group-hover:h-40 transition-all duration-700" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/25 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,87,0.12),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.15em]">On-Device</span>
                </div>

                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2.5">
                  Distill it
                </h3>
                <p className="text-[13px] text-secondary leading-relaxed mb-5">
                  Transcribed on-device in minutes. Summarized by any model you choose.
                </p>

                {/* Mini visual: speed indicator */}
                <div className="bg-bg/60 rounded-[10px] border border-border p-3">
                  <div className="flex items-center justify-between text-[11px] mb-2">
                    <span className="text-stone font-[family-name:var(--font-mono)]">1hr audio</span>
                    <span className="text-accent font-[family-name:var(--font-mono)] font-medium">&lt; 2 min</span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                    <div className="h-full w-[95%] bg-gradient-to-r from-accent/50 via-accent to-accent/70 rounded-full shimmer-accent" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Connector 2→3 ─── */}
          <div className="hidden md:flex items-center justify-center px-2">
            <div className="relative w-12 h-[3px]">
              <div className="absolute inset-0 bg-gradient-to-r from-accent/20 to-accent/40 rounded-full" />
              <div className="absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-accent/70 shadow-[0_0_10px_rgba(217,119,87,0.6)] pipeline-particle" />
              <div className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/50 shadow-[0_0_6px_rgba(217,119,87,0.4)] pipeline-particle-3" />
            </div>
          </div>
          {/* Mobile connector */}
          <div className="flex md:hidden justify-center">
            <div className="relative w-[3px] h-8">
              <div className="absolute inset-0 bg-gradient-to-b from-accent/20 to-accent/40 rounded-full" />
              <div className="absolute left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent/70 shadow-[0_0_10px_rgba(217,119,87,0.6)] pipeline-particle-v-2" />
            </div>
          </div>

          {/* ─── Step 3: Work with it ─── */}
          <div className="pipeline-step pipeline-step-3 relative group">
            <div className="bg-surface/80 border border-border rounded-[16px] p-6 transition-all duration-500 hover:border-accent/25 hover:shadow-[0_8px_32px_rgba(217,119,87,0.08)] relative overflow-hidden">
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/[0.04] rounded-full blur-[30px] group-hover:bg-accent/[0.08] transition-all duration-500" />

              <div className="relative">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-[12px] bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center shadow-[0_0_16px_rgba(217,119,87,0.08),inset_0_1px_0_rgba(255,255,255,0.05)]">
                    <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a8 8 0 018 8c0 3.4-2.1 6.3-5 7.5V20a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2.5C6.1 16.3 4 13.4 4 10a8 8 0 018-8z" />
                      <path d="M10 14.5a2 2 0 012-2 2 2 0 012 2" />
                      <line x1="12" y1="6" x2="12" y2="8" />
                    </svg>
                  </div>
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent/60 uppercase tracking-[0.15em]">Output</span>
                </div>

                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2.5">
                  Work with it
                </h3>
                <p className="text-[13px] text-secondary leading-relaxed mb-5">
                  Search it. Ask it questions. Surface patterns. Create from it.
                </p>

                {/* Mini visual: output modes */}
                <div className="space-y-1.5">
                  {[
                    { icon: "⌕", label: "Search" },
                    { icon: "◇", label: "Chat" },
                    { icon: "▤", label: "Create" },
                  ].map((mode) => (
                    <div key={mode.label} className="flex items-center gap-2.5 text-[11px]">
                      <span className="text-accent w-4 text-center">{mode.icon}</span>
                      <span className="text-secondary">{mode.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Feature Grid ───────────────────────────────────────────── */

function FeatureGrid() {
  const features = [
    {
      title: "Multi-source ingest",
      description: "Files, YouTube links, RSS feeds, or any URL. One field, auto-detected.",
      icon: (
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      ),
      iconShape: "rounded-[8px]" as const,
      cardClass: "hover:border-accent/20",
      texture: null,
    },
    {
      title: "On-device transcription",
      description: "30-50x realtime on Apple Silicon. Audio never leaves your machine.",
      icon: (
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      ),
      iconShape: "rounded-full" as const,
      cardClass: "border-accent/10 hover:border-accent/30",
      texture: null,
    },
    {
      title: "Bring your own model",
      description: "Use any LLM with your own API key. No markup, no middleman.",
      icon: (
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0110 0v4" />
        </svg>
      ),
      iconShape: "rounded-full" as const,
      cardClass: "hover:border-accent/25",
      texture: "diagonal-lines",
    },
    {
      title: "Custom templates",
      description: "Define how content gets shaped. We call them Recipes — run on any transcript.",
      icon: (
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <path d="M7 7h10M7 12h10M7 17h6" />
        </svg>
      ),
      iconShape: "rounded-[8px]" as const,
      cardClass: "hover:border-accent/15",
      texture: null,
    },
    {
      title: "Full-text search",
      description: "Find anything across every transcript and every generated document.",
      icon: (
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      ),
      iconShape: "rounded-full" as const,
      cardClass: "hover:border-accent/25",
      texture: null,
    },
  ];

  return (
    <section id="features" className="px-6 py-28 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
            What you get
          </h2>
          <p className="text-secondary">Every tier. Every feature. No upsells.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Hero card — spans 2 columns */}
          <div className="card-glow lg:col-span-2 bg-surface/60 border border-accent/20 rounded-[14px] p-6 transition-all duration-300 relative overflow-hidden hover:border-accent/35 hover:shadow-[0_8px_32px_rgba(217,119,87,0.08)]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <div className="w-9 h-9 rounded-full bg-accent/10 border border-accent/15 ring-1 ring-accent/10 flex items-center justify-center mb-4 text-accent">
                  <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                  </svg>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-base mb-2">
                  Ask, Search, Create
                </h3>
                <p className="text-[13px] text-secondary leading-relaxed">
                  Your AI research assistant with tool-use capabilities. Search across your entire library, extract information from any episode, and create structured content — all from a single conversation.
                </p>
              </div>
              <div className="bg-bg/60 border border-border rounded-[10px] p-4 space-y-3">
                <div className="bg-accent/[0.06] border border-accent/10 rounded-[8px] px-3 py-2">
                  <span className="text-[11px] text-stone font-[family-name:var(--font-mono)]">you</span>
                  <p className="text-[12px] text-text mt-1">Find every mention of churn across last month&apos;s interviews</p>
                </div>
                <div className="bg-surface/80 border border-border rounded-[8px] px-3 py-2.5">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent/60" />
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent">3 matches found</span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-stone font-[family-name:var(--font-mono)]">Ep. 12 — 04:32</div>
                    <div className="text-[10px] text-stone font-[family-name:var(--font-mono)]">Ep. 8 — 11:15</div>
                    <div className="text-[10px] text-stone font-[family-name:var(--font-mono)]">Ep. 3 — 22:41</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Standard feature cards */}
          {features.map((feature) => (
            <div
              key={feature.title}
              className={`bg-surface/60 border border-border rounded-[14px] p-6 transition-all duration-300 relative overflow-hidden ${feature.cardClass}`}
            >
              {feature.texture && (
                <div className={`absolute inset-0 ${feature.texture} pointer-events-none ${feature.texture === "diagonal-lines" ? "opacity-[0.04]" : "opacity-[0.02]"}`} />
              )}
              <div className={`relative w-9 h-9 ${feature.iconShape} bg-accent/10 border border-accent/15 flex items-center justify-center mb-4 text-accent`}>
                {feature.icon}
              </div>
              <h3 className="relative font-[family-name:var(--font-heading)] font-semibold text-sm mb-2">
                {feature.title}
              </h3>
              <p className="relative text-[13px] text-secondary leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Use Cases ──────────────────────────────────────────────── */

function UseCases() {
  return (
    <section className="px-6 py-28 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="geo-ring geo-ring-lg top-[10%] right-[-200px] opacity-40" />
      <div className="geo-ring geo-ring-md bottom-[15%] left-[-100px] opacity-25" />

      <div className="max-w-5xl mx-auto relative">
        <div className="text-center mb-16">
          <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
            See yourself in here
          </h2>
          <p className="text-secondary">
            Same app. Different workflows. Same result: knowledge you can find again.
          </p>
        </div>

        {/* Staggered grid of use case cards */}
        <div className="space-y-5">

          {/* Card 1: Conference Talks */}
          <div className="card-glow bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
              <div className="p-7 flex flex-col justify-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest mb-3">Developer</span>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2">
                  12 conference talks. One search bar.
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Paste YouTube links from WWDC, JSConf, Strange Loop. Build a searchable library of every talk you watched.
                </p>
              </div>
              <div className="bg-bg-deep border-l border-border p-5 font-[family-name:var(--font-mono)] text-xs">
                <div className="bg-surface border border-border rounded-[8px] px-3 py-2 mb-3 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-stone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span className="text-accent">React Server Components</span>
                  <span className="text-stone ml-auto">8 episodes</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { ep: "Dan Abramov — RemixConf '24", match: "...RSC eliminates the waterfall by..." },
                    { ep: "Ryan Florence — React Summit", match: "...server components change how we think about..." },
                    { ep: "Kent C. Dodds — Epic Web", match: "...the mental model shift with RSC is..." },
                  ].map((r) => (
                    <div key={r.ep} className="bg-surface/50 border border-border/50 rounded-[6px] px-3 py-2">
                      <div className="text-text text-[11px] mb-0.5 truncate">{r.ep}</div>
                      <div className="text-stone text-[10px] truncate">{r.match}</div>
                    </div>
                  ))}
                </div>
                <div className="text-stone/50 text-[10px] mt-2 text-right">&uarr; found across 6 months of talks</div>
              </div>
            </div>
          </div>

          {/* Cards 2+3: Side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* Card 2: Meetings */}
            <div className="card-glow bg-surface border border-border rounded-[14px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300">
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest">Meetings</span>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mt-2 mb-2">
                Three meetings today. Zero lost action items.
              </h3>
              <p className="text-sm text-secondary leading-relaxed mb-5">
                Drop in the recording. Get structured decisions and action items in seconds.
              </p>
              <div className="bg-bg/60 border border-border rounded-[10px] p-4 space-y-2.5">
                <div className="text-[10px] text-stone font-[family-name:var(--font-mono)] uppercase tracking-wider mb-2">Action Items — Q3 Planning</div>
                {[
                  { who: "Sarah", task: "Finalize API spec by Friday", done: true },
                  { who: "Marcus", task: "Set up staging environment", done: true },
                  { who: "You", task: "Review pricing proposal", done: false },
                ].map((item) => (
                  <div key={item.task} className="flex items-start gap-2.5">
                    <div className={`w-4 h-4 rounded border flex-shrink-0 mt-0.5 flex items-center justify-center ${item.done ? 'bg-accent/20 border-accent/40' : 'border-stone/30'}`}>
                      {item.done && <svg className="w-2.5 h-2.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>}
                    </div>
                    <div>
                      <span className="text-[12px] text-text">{item.task}</span>
                      <span className="text-[10px] text-stone ml-2">&mdash; {item.who}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Card 3: Podcasts */}
            <div className="card-glow bg-surface border border-border rounded-[14px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/[0.04] rounded-full blur-[50px]" />

              <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest relative">Research</span>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mt-2 mb-2 relative">
                30 podcast episodes. Your personal research assistant.
              </h3>
              <p className="text-sm text-secondary leading-relaxed mb-5 relative">
                Subscribe to feeds. Auto-ingest episodes. Search across months of listening.
              </p>
              <div className="relative h-36">
                <div className="absolute bottom-0 left-3 right-3 h-24 bg-surface-raised/50 border border-border/40 rounded-[8px] rotate-[-1deg]" />
                <div className="absolute bottom-1 left-1.5 right-1.5 h-24 bg-surface-raised/70 border border-border/50 rounded-[8px] rotate-[0.5deg]" />
                <div className="absolute bottom-2 left-0 right-0 bg-bg/80 border border-border rounded-[8px] p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-accent/10 flex items-center justify-center">
                      <svg className="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    </div>
                    <span className="text-[11px] text-text font-medium">Startup Pods</span>
                    <span className="text-[10px] text-stone ml-auto">30 episodes</span>
                  </div>
                  <div className="bg-surface border border-border rounded-[6px] px-2.5 py-1.5 flex items-center gap-2">
                    <svg className="w-3 h-3 text-stone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span className="text-[10px] text-accent font-[family-name:var(--font-mono)]">pricing strategy</span>
                    <span className="text-[10px] text-stone ml-auto">7 results</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Card 4: Customer Interviews */}
          <div className="card-glow bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
              <div className="bg-bg-deep border-r border-border p-6 relative overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-30" />
                <div className="relative">
                  <div className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-wider mb-4">Pattern Analysis — 15 interviews</div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Onboarding confusion", count: 11, pct: 73 },
                      { label: "Pricing unclear", count: 8, pct: 53 },
                      { label: "Missing integrations", count: 6, pct: 40 },
                      { label: "Performance issues", count: 4, pct: 27 },
                    ].map((item) => (
                      <div key={item.label}>
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="text-secondary">{item.label}</span>
                          <span className="text-stone font-[family-name:var(--font-mono)]">{item.count}/15</span>
                        </div>
                        <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-accent/60 to-accent rounded-full"
                            style={{ width: `${item.pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 bg-surface/60 border border-border rounded-[8px] px-3 py-2">
                    <span className="text-[10px] text-stone">Chat:</span>
                    <span className="text-[11px] text-text ml-1 font-[family-name:var(--font-accent)] italic">&ldquo;What pain points keep coming up?&rdquo;</span>
                  </div>
                </div>
              </div>
              <div className="p-7 flex flex-col justify-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest mb-3">Product</span>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2">
                  Customer interviews &rarr; patterns in minutes.
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Ingest 15 customer calls. Ask one question across all of them. See what actually keeps coming up — not what you assumed.
                </p>
              </div>
            </div>
          </div>

          {/* Card 5: Lecture */}
          <div className="card-glow bg-surface border border-border rounded-[14px] p-7 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300 relative overflow-hidden">
            <div className="absolute bottom-0 left-[30%] w-[300px] h-[200px] bg-accent/[0.03] rounded-full blur-[80px] pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6 relative">
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest mb-3">Learning</span>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2">
                  One lecture. Five outputs.
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Run different presets on the same 90-minute recording. Brief for review, detailed for study, key quotes for your paper.
                </p>
              </div>
              <div className="relative h-48 md:h-auto">
                {[
                  { title: "Full Notes", offset: "top-0 left-0", rotate: "rotate-[-3deg]", opacity: "opacity-50" },
                  { title: "Study Questions", offset: "top-2 left-4", rotate: "rotate-[-1.5deg]", opacity: "opacity-60" },
                  { title: "Key Quotes", offset: "top-4 left-8", rotate: "rotate-[0deg]", opacity: "opacity-70" },
                  { title: "Show Notes", offset: "top-6 left-12", rotate: "rotate-[1.5deg]", opacity: "opacity-80" },
                ].map((tab) => (
                  <div
                    key={tab.title}
                    className={`absolute ${tab.offset} ${tab.rotate} ${tab.opacity} w-[70%] bg-bg border border-border rounded-[8px] p-3 shadow-[0_2px_8px_rgba(0,0,0,0.2)]`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-stone/30" />
                      <span className="text-[10px] text-stone font-[family-name:var(--font-mono)]">{tab.title}</span>
                    </div>
                    <div className="mt-2 space-y-1">
                      <div className="h-1.5 bg-surface rounded w-full" />
                      <div className="h-1.5 bg-surface rounded w-[80%]" />
                      <div className="h-1.5 bg-surface rounded w-[60%]" />
                    </div>
                  </div>
                ))}
                <div className="absolute top-8 left-16 rotate-[3deg] w-[70%] bg-bg border border-accent/20 rounded-[8px] p-3 shadow-[0_4px_16px_rgba(217,119,87,0.08)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-accent/60" />
                    <span className="text-[10px] text-accent font-[family-name:var(--font-mono)]">Brief Summary</span>
                  </div>
                  <div className="mt-2 space-y-1.5">
                    <div className="h-1.5 bg-accent/10 rounded w-full" />
                    <div className="h-1.5 bg-accent/10 rounded w-[90%]" />
                    <div className="h-1.5 bg-accent/10 rounded w-[70%]" />
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Pricing ─────────────────────────────────────────────────── */

function Pricing() {
  const tiers = [
    {
      name: "Solo",
      price: 25,
      devices: 1,
      href: "https://buy.polar.sh/polar_cl_OE9GPqVt3kxD5jh0SMy4QYZ2SUJNnPdrbBhkp410YT6",
    },
    {
      name: "Personal",
      price: 39,
      devices: 2,
      highlighted: true,
      href: "https://buy.polar.sh/polar_cl_hz4vZjB1wqOHshCiCGTFAY3qxhWpgmwjvFNy44S5bou",
    },
    {
      name: "Extended",
      price: 49,
      devices: 3,
      href: "https://buy.polar.sh/polar_cl_tGvATndAmHjDXxdUCUHqBJC4Ym8JVbNHet6PH2yTypO",
    },
  ];

  return (
    <section id="pricing" className="px-6 py-28 relative section-glow">
      <div className="max-w-3xl mx-auto relative">
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
            One-time purchase
          </h2>
          <p className="text-secondary">
            Every tier includes all features. Forever. The only difference is how many Macs you own.
          </p>
        </div>

        <div className="bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="px-6 py-4 border-b border-border bg-bg/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(217,119,87,0.4)]" />
              <span className="text-[11px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-wider">License Configuration</span>
            </div>
            <span className="text-[11px] text-accent font-[family-name:var(--font-mono)]">14-day free trial</span>
          </div>

          <div className="divide-y divide-border">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`px-6 py-5 flex items-center gap-4 transition-all duration-200 ${
                  tier.highlighted
                    ? "bg-accent/[0.04] relative"
                    : "hover:bg-surface-raised/30"
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-full" />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-base">
                      {tier.name}
                    </h3>
                    {tier.highlighted && (
                      <span className="text-[10px] font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full border border-accent/15">
                        Most popular
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {Array.from({ length: tier.devices }).map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-[4px] bg-accent/15 border border-accent/20 flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                    ))}
                    {Array.from({ length: 3 - tier.devices }).map((_, i) => (
                      <div key={i} className="w-4 h-4 rounded-[4px] bg-bg/40 border border-border flex items-center justify-center">
                        <svg className="w-2.5 h-2.5 text-stone/30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                        </svg>
                      </div>
                    ))}
                    <span className="text-[11px] text-secondary ml-1.5">
                      {tier.devices} {tier.devices === 1 ? "device" : "devices"}
                    </span>
                  </div>
                </div>

                <div className="text-right mr-4">
                  <span className="text-2xl font-[family-name:var(--font-heading)] font-bold tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-[11px] text-stone ml-1">once</span>
                </div>

                <a
                  href={tier.href}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-200 ${
                    tier.highlighted
                      ? "bg-accent hover:bg-accent-hover text-text shadow-[0_2px_12px_rgba(217,119,87,0.25)] hover:shadow-[0_4px_16px_rgba(217,119,87,0.35)] hover:translate-y-[-1px]"
                      : "bg-surface-raised border border-border hover:border-accent/20 text-text"
                  }`}
                >
                  Get {tier.name}
                </a>
              </div>
            ))}
          </div>

          <div className="px-6 py-4 border-t border-border bg-bg/40">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-stone">
              <span className="flex items-center gap-1.5">
                <span className="text-accent">&check;</span> All features included
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">&check;</span> Lifetime updates
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">&check;</span> No subscription
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">&check;</span> BYOK — no API markup
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">&check;</span> <GitHubStars fallbackText="Open source — no lock-in" className="text-[11px]" />
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Open Source ────────────────────────────────────────────── */

function OpenSource() {
  return (
    <section id="open-source" className="px-6 py-20 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-2xl mx-auto text-center">
        <h2 className="font-[family-name:var(--font-heading)] text-[28px] font-semibold mb-3">
          See exactly how your data is handled.
        </h2>
        <p className="text-secondary text-sm leading-relaxed mb-6">
          Every line of code is auditable. The source is open — not because we had to, but because privacy claims mean nothing without proof.
        </p>
        <GitHubStars
          fallbackText="Star on GitHub"
          className="inline-flex items-center gap-2 bg-surface/80 border border-border rounded-[10px] px-4 py-2.5 text-sm hover:border-accent/20 hover:text-text transition-all duration-200"
        />
      </div>
    </section>
  );
}

/* ─── FAQ ─────────────────────────────────────────────────────── */

function FAQ() {
  const faqs = [
    {
      q: "Is my audio sent to the cloud?",
      a: "No. Transcription runs entirely on your Mac using Apple Silicon. Audio files never leave your machine. AI features (summaries, chat) use your own API key — calls go directly from your Mac to the provider you choose.",
    },
    {
      q: "What does 'bring your own model' mean?",
      a: "You provide your own API key (e.g., OpenRouter, Anthropic, OpenAI). Audistill sends your transcript to the model you pick for summaries and chat. Typical cost: a few cents per episode. We never see your key or your data.",
    },
    {
      q: "What happens after the 14-day trial?",
      a: "The app remains viewable — you can browse your library, read transcripts, and search. Ingest, chat, and recipe execution require a license to continue.",
    },
    {
      q: "Is this a subscription?",
      a: "No. One-time purchase, lifetime updates. Pick the tier that matches how many Macs you own.",
    },
    {
      q: "What Mac do I need?",
      a: "Any Mac with Apple Silicon (M1 or later). macOS 13 Ventura or newer. Intel Macs are not supported.",
    },
    {
      q: "Can I build from source instead of buying?",
      a: "The source code is available. You can build and run it yourself. The paid download gives you a signed, notarized binary with auto-updates and supports continued development.",
    },
  ];

  return (
    <section id="faq" className="px-6 py-28 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-2xl mx-auto relative">
        <div className="text-center mb-12">
          <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
            Questions
          </h2>
        </div>

        <div className="space-y-4">
          {faqs.slice(0, 3).map((faq) => (
            <div
              key={faq.q}
              className="bg-surface/60 border border-border rounded-[12px] p-5 hover:border-accent/15 transition-colors duration-200"
            >
              <h3 className="font-[family-name:var(--font-heading)] font-medium text-[15px] mb-2">
                {faq.q}
              </h3>
              <p className="text-sm text-secondary leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}

          <div className="border-l-2 border-accent/40 bg-accent/[0.03] rounded-r-[12px] px-6 py-5 my-6">
            <p className="font-[family-name:var(--font-accent)] italic text-[15px] text-text/90 leading-relaxed">
              &ldquo;Your audio never leaves your machine. Transcription happens entirely on-device.&rdquo;
            </p>
          </div>

          {faqs.slice(3).map((faq) => (
            <div
              key={faq.q}
              className="bg-surface/60 border border-border rounded-[12px] p-5 hover:border-accent/15 transition-colors duration-200"
            >
              <h3 className="font-[family-name:var(--font-heading)] font-medium text-[15px] mb-2">
                {faq.q}
              </h3>
              <p className="text-sm text-secondary leading-relaxed">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─── Install / Final CTA ─────────────────────────────────────── */

function Install() {
  return (
    <section id="install" className="px-6 py-28 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-xl mx-auto text-center">
        <h2 className="font-[family-name:var(--font-heading)] text-[clamp(28px,4vw,36px)] font-semibold tracking-tight mb-3">
          Take it from here.
        </h2>
        <p className="text-secondary text-sm mb-10">
          14 days free. No credit card. Just audio in, knowledge out.
        </p>

        {/* DMG download — primary */}
        <a
          href="#"
          className="inline-block bg-accent hover:bg-accent-hover active:bg-accent-pressed text-text text-sm font-medium px-8 py-3.5 rounded-[12px] transition-all duration-200 shadow-[0_2px_12px_rgba(217,119,87,0.25),0_4px_24px_rgba(217,119,87,0.15)] hover:shadow-[0_4px_20px_rgba(217,119,87,0.35),0_8px_40px_rgba(217,119,87,0.2)] hover:translate-y-[-1px] mb-4"
        >
          Download for Mac
        </a>

        {/* Brew command — secondary */}
        <BrewCommand />

        <div className="mt-6">
          <GitHubStars fallbackText="Star on GitHub" className="text-[12px] opacity-60 hover:opacity-100" />
        </div>
      </div>
    </section>
  );
}

