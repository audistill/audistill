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
      <FAQ />
      <OpenSource />
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
        {/* Badges */}
        <div className="animate-fade-up flex flex-wrap items-center justify-center gap-3 mb-8">
          <div className="inline-flex items-center gap-2 bg-surface/80 backdrop-blur border border-border rounded-full px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]">
            <div className="w-1.5 h-1.5 rounded-full bg-accent shadow-[0_0_6px_rgba(217,119,87,0.6)] pulse-soft" />
            <span className="text-xs text-secondary font-medium">Runs entirely on your Mac</span>
          </div>
          <a
            href="https://github.com/audistill/audistill"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-surface/80 backdrop-blur border border-border hover:border-accent/20 rounded-full px-3.5 py-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors duration-200 group"
          >
            <svg className="w-3.5 h-3.5 text-secondary group-hover:text-text transition-colors" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
            <span className="text-xs text-secondary group-hover:text-text font-medium transition-colors">Open Source</span>
          </a>
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
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <a
              href="#install"
              className="bg-accent hover:bg-accent-hover active:bg-accent-pressed text-text text-sm font-medium px-8 py-3.5 rounded-[12px] transition-all duration-200 shadow-[0_2px_12px_rgba(217,119,87,0.25),0_4px_24px_rgba(217,119,87,0.15)] hover:shadow-[0_4px_20px_rgba(217,119,87,0.35),0_8px_40px_rgba(217,119,87,0.2)] hover:translate-y-[-1px]"
            >
              Download for Mac
            </a>
            <GitHubStars variant="button" />
          </div>
          <BrewCommand />
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

/* ─── Pipeline / How it Works — Editorial Timeline ───────────── */

function Pipeline() {
  return (
    <section className="px-6 py-32 relative section-glow overflow-hidden">
      {/* Background atmosphere */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-accent/[0.025] rounded-full blur-[120px]" />
      </div>

      <div className="max-w-5xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-24">
          <span className="inline-block text-[11px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.2em] mb-4">The Pipeline</span>
          <h2 className="font-[family-name:var(--font-heading)] text-[clamp(32px,5vw,44px)] font-bold tracking-[-0.02em] mb-4">
            Three steps. Zero friction.
          </h2>
          <p className="text-secondary text-base max-w-md mx-auto leading-relaxed">
            From raw audio to searchable knowledge — entirely on your machine.
          </p>
        </div>

        {/* Timeline container */}
        <div className="relative">
          {/* Vertical flowing line — desktop only */}
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px">
            <div className="absolute inset-0 bg-gradient-to-b from-border via-accent/30 to-accent/50 rounded-full" />
            {/* Animated glow traveling down the line */}
            <div className="absolute left-1/2 -translate-x-1/2 w-3 h-20 bg-gradient-to-b from-transparent via-accent/40 to-transparent rounded-full blur-[4px] pipeline-line-glow" />
          </div>

          {/* Steps */}
          <div className="space-y-16 md:space-y-0">

            {/* ─── Step 1: Drop it in ─── */}
            <div className="pipeline-step pipeline-step-1 md:grid md:grid-cols-2 md:gap-16 md:items-center md:pb-24">
              {/* Content — left side */}
              <div className="md:text-right">
                <div className="inline-flex items-center gap-3 mb-5 md:flex-row-reverse">
                  <span className="font-[family-name:var(--font-heading)] text-[64px] md:text-[80px] font-bold leading-none text-accent/[0.08] select-none">01</span>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-2xl md:text-[28px] tracking-[-0.01em] mb-3">
                  Drop it in
                </h3>
                <p className="text-secondary text-[15px] leading-relaxed mb-6 max-w-sm md:ml-auto">
                  Files, YouTube links, RSS feeds, or any URL. One input field auto-detects everything.
                </p>
                {/* Source pills */}
                <div className="flex flex-wrap gap-2 md:justify-end">
                  {["MP3", "YouTube", "RSS", "URL", "Podcast Feed"].map((source) => (
                    <span key={source} className="text-[11px] font-[family-name:var(--font-mono)] text-stone/80 bg-surface/80 px-3 py-1.5 rounded-full border border-border hover:border-accent/20 hover:text-accent/80 transition-colors duration-200">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
              {/* Visual — right side */}
              <div className="mt-8 md:mt-0 relative">
                {/* Node dot on the timeline */}
                <div className="hidden md:block absolute left-0 top-1/2 -translate-x-[calc(50%+2rem)] -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full bg-bg border-2 border-accent/40 shadow-[0_0_12px_rgba(217,119,87,0.3)]" />
                </div>
                <div className="bg-surface/70 border border-border rounded-[16px] p-5 backdrop-blur-sm hover:border-accent/20 transition-all duration-300 group">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent/60 uppercase tracking-[0.15em]">Input</span>
                  </div>
                  {/* Drop zone mockup */}
                  <div className="border-2 border-dashed border-border/60 rounded-[12px] p-5 flex flex-col items-center justify-center text-center group-hover:border-accent/20 transition-colors duration-300">
                    <svg className="w-8 h-8 text-stone/40 mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    <span className="text-[12px] text-stone/60 font-[family-name:var(--font-mono)]">Drop files or paste a link</span>
                  </div>
                </div>
              </div>
            </div>

            {/* ─── Step 2: Distill it (THE CORE) ─── */}
            <div className="pipeline-step pipeline-step-2 md:grid md:grid-cols-2 md:gap-16 md:items-center md:py-24">
              {/* Visual — left side (reversed order for zigzag) */}
              <div className="order-2 md:order-1 mt-8 md:mt-0 relative">
                {/* Node dot — glowing larger for emphasis */}
                <div className="hidden md:block absolute right-0 top-1/2 translate-x-[calc(50%+2rem)] -translate-y-1/2">
                  <div className="w-5 h-5 rounded-full bg-accent/20 border-2 border-accent/60 shadow-[0_0_20px_rgba(217,119,87,0.4),0_0_40px_rgba(217,119,87,0.15)]" />
                </div>
                <div className="relative bg-surface/90 border border-accent/25 rounded-[16px] p-6 shadow-[0_8px_40px_rgba(0,0,0,0.25),0_0_60px_rgba(217,119,87,0.06)] overflow-hidden group">
                  {/* Inner glow */}
                  <div className="absolute inset-0 bg-gradient-to-br from-accent/[0.05] via-transparent to-accent/[0.03] pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-accent/[0.05] rounded-full blur-[50px] group-hover:w-52 group-hover:h-52 transition-all duration-700" />

                  <div className="relative">
                    <div className="flex items-center gap-3 mb-5">
                      <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-accent/25 to-accent/10 border border-accent/30 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,87,0.15)]">
                        <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                      </div>
                      <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.15em]">On-Device</span>
                    </div>

                    {/* Speed benchmark */}
                    <div className="bg-bg/70 rounded-[12px] border border-border p-4 mb-4">
                      <div className="flex items-baseline justify-between mb-3">
                        <span className="text-[12px] text-stone font-[family-name:var(--font-mono)]">1 hr audio</span>
                        <span className="text-lg font-[family-name:var(--font-heading)] font-bold text-accent">&lt; 2 min</span>
                      </div>
                      <div className="h-2 bg-surface rounded-full overflow-hidden">
                        <div className="h-full w-[95%] bg-gradient-to-r from-accent/60 via-accent to-accent/80 rounded-full shimmer-accent" />
                      </div>
                      <p className="text-[10px] text-stone/60 mt-2 font-[family-name:var(--font-mono)]">30–50× realtime on Apple Silicon</p>
                    </div>

                    {/* Model choice */}
                    <div className="flex items-center gap-2 text-[11px] text-secondary">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                      <span>Summarized by any model you choose</span>
                    </div>
                  </div>
                </div>
              </div>
              {/* Content — right side */}
              <div className="order-1 md:order-2">
                <div className="inline-flex items-center gap-3 mb-5">
                  <span className="font-[family-name:var(--font-heading)] text-[64px] md:text-[80px] font-bold leading-none text-accent/[0.12] select-none">02</span>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-2xl md:text-[28px] tracking-[-0.01em] mb-3">
                  Distill it
                </h3>
                <p className="text-secondary text-[15px] leading-relaxed max-w-sm">
                  Transcribed on-device in minutes using Whisper on Apple Silicon. Then summarized, structured, and tagged by the LLM of your choice.
                </p>
                <p className="text-stone text-[13px] mt-4 font-[family-name:var(--font-accent)] italic">
                  Audio never leaves your machine.
                </p>
              </div>
            </div>

            {/* ─── Step 3: Work with it ─── */}
            <div className="pipeline-step pipeline-step-3 md:grid md:grid-cols-2 md:gap-16 md:items-center md:pt-24">
              {/* Content — left side */}
              <div className="md:text-right">
                <div className="inline-flex items-center gap-3 mb-5 md:flex-row-reverse">
                  <span className="font-[family-name:var(--font-heading)] text-[64px] md:text-[80px] font-bold leading-none text-accent/[0.08] select-none">03</span>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-2xl md:text-[28px] tracking-[-0.01em] mb-3">
                  Work with it
                </h3>
                <p className="text-secondary text-[15px] leading-relaxed max-w-sm md:ml-auto">
                  Search across everything. Ask questions. Surface patterns. Generate new content from your knowledge base.
                </p>
              </div>
              {/* Visual — right side */}
              <div className="mt-8 md:mt-0 relative">
                {/* Node dot */}
                <div className="hidden md:block absolute left-0 top-1/2 -translate-x-[calc(50%+2rem)] -translate-y-1/2">
                  <div className="w-4 h-4 rounded-full bg-bg border-2 border-accent/40 shadow-[0_0_12px_rgba(217,119,87,0.3)]" />
                </div>
                <div className="bg-surface/70 border border-border rounded-[16px] p-5 backdrop-blur-sm hover:border-accent/20 transition-all duration-300">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-[10px] bg-gradient-to-br from-accent/15 to-accent/5 border border-accent/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent/60 uppercase tracking-[0.15em]">Output</span>
                  </div>
                  {/* Output modes as interactive-looking rows */}
                  <div className="space-y-2.5">
                    {[
                      { icon: "⌕", label: "Search", desc: "Full-text across all transcripts" },
                      { icon: "◇", label: "Chat", desc: "Ask questions about your audio" },
                      { icon: "▤", label: "Create", desc: "Generate from your knowledge" },
                    ].map((mode) => (
                      <div key={mode.label} className="flex items-center gap-3 bg-bg/50 border border-border/60 rounded-[10px] px-4 py-3 hover:border-accent/15 transition-colors duration-200">
                        <span className="text-accent text-sm w-5 text-center">{mode.icon}</span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[13px] text-text font-medium">{mode.label}</span>
                          <span className="text-[11px] text-stone ml-2">{mode.desc}</span>
                        </div>
                      </div>
                    ))}
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

/* ─── Feature Grid ───────────────────────────────────────────── */

function FeatureGrid() {
  const features = [
    {
      title: "Ask, Search, Create",
      description: "A research assistant with tools. Search across your library, extract patterns, and generate new content — not just a chatbot.",
      icon: (
        <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      ),
      iconShape: "rounded-full" as const,
      border: "border-accent/20",
      hoverBorder: "hover:border-accent/30",
      texture: null,
      hero: true,
    },
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
      hoverBorder: "hover:border-accent/20",
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
      border: "border-accent/10",
      hoverBorder: "hover:border-accent/30",
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
      hoverBorder: "hover:border-accent/15",
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
      hoverBorder: "hover:border-accent/25",
      texture: "dot-grid",
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
      hoverBorder: "hover:border-accent/15",
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
          {features.map((feature) =>
            feature.hero ? (
              <div
                key={feature.title}
                className="relative lg:col-span-2 bg-surface/60 border border-accent/20 rounded-[14px] p-6 hover:border-accent/30 transition-all duration-300 overflow-hidden card-glow"
              >
                <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                  <div className="flex-1 min-w-0">
                    <div className="relative w-9 h-9 rounded-full bg-accent/10 border border-accent/15 ring-1 ring-accent/10 flex items-center justify-center mb-4 text-accent">
                      {feature.icon}
                    </div>
                    <h3 className="relative font-[family-name:var(--font-heading)] font-semibold text-sm mb-2">
                      {feature.title}
                    </h3>
                    <p className="relative text-[13px] text-secondary leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                  <div className="lg:w-[260px] shrink-0">
                    <div className="rounded-[10px] bg-surface/50 border border-border/60 p-3 space-y-2.5 backdrop-blur-sm">
                      <div className="flex justify-end">
                        <div className="bg-accent/10 border border-accent/15 rounded-[8px] px-3 py-1.5 max-w-[200px]">
                          <p className="text-[11px] text-primary/80 leading-snug">Find every mention of churn across last month&apos;s interviews</p>
                        </div>
                      </div>
                      <div className="rounded-[8px] bg-background/60 border border-border/40 p-2.5">
                        <p className="text-[10px] font-medium text-primary/70 mb-1.5">3 matches found</p>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-[10px] text-secondary/70">
                            <span className="w-1 h-1 rounded-full bg-accent/50" />
                            <span>Ep. 12 — 04:32</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-secondary/70">
                            <span className="w-1 h-1 rounded-full bg-accent/50" />
                            <span>Ep. 8 — 11:15</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-secondary/70">
                            <span className="w-1 h-1 rounded-full bg-accent/50" />
                            <span>Ep. 3 — 22:48</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div
                key={feature.title}
                className={`relative bg-surface/60 border ${feature.border ?? "border-border"} rounded-[14px] p-6 ${feature.hoverBorder} transition-all duration-300 overflow-hidden`}
              >
                {feature.texture && (
                  <div className={`absolute inset-0 ${feature.texture} ${feature.texture === "diagonal-lines" ? "opacity-[0.04]" : "opacity-[0.02]"} pointer-events-none`} />
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
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* ─── Use Cases ──────────────────────────────────────────────── */

function UseCases() {
  return (
    <section className="px-6 py-32 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Atmospheric background */}
      <div className="absolute top-[30%] right-[-10%] w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-5%] w-[400px] h-[400px] bg-accent/[0.015] rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-6xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-20">
          <span className="inline-block text-[11px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.2em] mb-4">Use Cases</span>
          <h2 className="font-[family-name:var(--font-heading)] text-[clamp(32px,5vw,44px)] font-bold tracking-[-0.02em] mb-4">
            See yourself in here
          </h2>
          <p className="text-secondary text-base max-w-lg mx-auto leading-relaxed">
            Same app. Different workflows. Same result: knowledge you can actually find again.
          </p>
        </div>

        {/* Bento grid layout */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">

          {/* ─── Card 1: Conference Talks — Full width hero ─── */}
          <div className="md:col-span-12 group">
            <div className="relative bg-gradient-to-br from-surface/90 to-surface/60 border border-border rounded-[18px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.25)] hover:border-accent/20 transition-all duration-400">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.4fr]">
                {/* Text side */}
                <div className="p-8 lg:p-10 flex flex-col justify-center relative">
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-accent/[0.03] to-transparent pointer-events-none" />
                  <div className="relative">
                    <div className="inline-flex items-center gap-2 bg-accent/[0.08] border border-accent/15 rounded-full px-3 py-1 mb-5">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/70" />
                      <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.12em]">Developer</span>
                    </div>
                    <h3 className="font-[family-name:var(--font-heading)] font-semibold text-2xl lg:text-[28px] tracking-[-0.01em] mb-3 leading-tight">
                      12 conference talks.<br/>One search bar.
                    </h3>
                    <p className="text-[15px] text-secondary leading-relaxed max-w-sm">
                      Paste YouTube links from WWDC, JSConf, Strange Loop. Build a searchable library of every talk you watched.
                    </p>
                  </div>
                </div>
                {/* Mockup side */}
                <div className="bg-bg-deep/80 border-t lg:border-t-0 lg:border-l border-border p-6 lg:p-8 font-[family-name:var(--font-mono)]">
                  {/* Search bar */}
                  <div className="bg-surface border border-border rounded-[10px] px-4 py-3 mb-4 flex items-center gap-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <svg className="w-4 h-4 text-stone/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <span className="text-sm text-accent">React Server Components</span>
                    <span className="text-[11px] text-stone/60 ml-auto bg-bg/60 px-2 py-0.5 rounded">8 results</span>
                  </div>
                  {/* Results */}
                  <div className="space-y-2.5">
                    {[
                      { ep: "Dan Abramov — RemixConf '24", time: "14:32", match: "…RSC eliminates the waterfall by moving data fetching to the server…" },
                      { ep: "Ryan Florence — React Summit", time: "08:15", match: "…server components change how we think about the component tree…" },
                      { ep: "Kent C. Dodds — Epic Web", time: "22:48", match: "…the mental model shift with RSC is fundamentally about ownership…" },
                    ].map((r) => (
                      <div key={r.ep} className="bg-surface/60 border border-border/60 rounded-[10px] px-4 py-3 hover:border-accent/15 transition-colors duration-200">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[12px] text-text font-medium">{r.ep}</span>
                          <span className="text-[10px] text-accent/70 bg-accent/[0.08] px-2 py-0.5 rounded">{r.time}</span>
                        </div>
                        <p className="text-[11px] text-stone leading-relaxed">{r.match}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-stone/40 mt-3 text-right">↑ found across 6 months of talks</p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Card 2: Meetings — Left column ─── */}
          <div className="md:col-span-7 group">
            <div className="h-full relative bg-surface/70 border border-border rounded-[18px] p-7 lg:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:border-accent/20 transition-all duration-400 overflow-hidden">
              {/* Subtle corner glow */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-accent/[0.03] rounded-full blur-[60px] pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-surface-raised/60 border border-border rounded-full px-3 py-1 mb-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400/70" />
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-[0.12em]">Meetings</span>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl lg:text-[22px] tracking-[-0.01em] mb-2 leading-tight">
                  Three meetings today.<br/>Zero lost action items.
                </h3>
                <p className="text-[14px] text-secondary leading-relaxed mb-6 max-w-md">
                  Drop in the recording. Get structured decisions and action items in seconds.
                </p>

                {/* Action items mockup */}
                <div className="bg-bg/70 border border-border rounded-[12px] p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-stone font-[family-name:var(--font-mono)] uppercase tracking-wider">Action Items — Q3 Planning</span>
                    <span className="text-[10px] text-accent/60 font-[family-name:var(--font-mono)]">3 items</span>
                  </div>
                  <div className="space-y-3">
                    {[
                      { who: "Sarah", task: "Finalize API spec by Friday", done: true },
                      { who: "Marcus", task: "Set up staging environment", done: true },
                      { who: "You", task: "Review pricing proposal", done: false },
                    ].map((item) => (
                      <div key={item.task} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-[5px] border flex-shrink-0 flex items-center justify-center transition-colors ${item.done ? 'bg-accent/15 border-accent/30' : 'border-stone/25 bg-surface/30'}`}>
                          {item.done && <svg className="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}><polyline points="20 6 9 17 4 12"/></svg>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className={`text-[13px] ${item.done ? 'text-stone line-through' : 'text-text'}`}>{item.task}</span>
                        </div>
                        <span className="text-[10px] text-stone/60 font-[family-name:var(--font-mono)]">{item.who}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Card 3: Podcasts/Research — Right column ─── */}
          <div className="md:col-span-5 group">
            <div className="h-full relative bg-surface/70 border border-border rounded-[18px] p-7 lg:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:border-accent/20 transition-all duration-400 overflow-hidden">
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/[0.04] rounded-full blur-[50px] pointer-events-none" />

              <div className="relative">
                <div className="inline-flex items-center gap-2 bg-surface-raised/60 border border-border rounded-full px-3 py-1 mb-5">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400/70" />
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-[0.12em]">Research</span>
                </div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl tracking-[-0.01em] mb-2 leading-tight">
                  30 episodes. One question.
                </h3>
                <p className="text-[14px] text-secondary leading-relaxed mb-6">
                  Subscribe to feeds. Auto-ingest. Search across months of listening.
                </p>

                {/* Podcast library mockup */}
                <div className="bg-bg/70 border border-border rounded-[12px] overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/60 flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-accent/10 border border-accent/15 flex items-center justify-center">
                      <svg className="w-3 h-3 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    </div>
                    <span className="text-[12px] text-text font-medium">Startup Pods</span>
                    <span className="text-[10px] text-stone ml-auto">30 ep</span>
                  </div>
                  <div className="p-3">
                    <div className="bg-surface/60 border border-border/50 rounded-[8px] px-3 py-2.5 flex items-center gap-2">
                      <svg className="w-3.5 h-3.5 text-stone/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      <span className="text-[11px] text-accent font-[family-name:var(--font-mono)]">pricing strategy</span>
                    </div>
                    <div className="mt-2.5 space-y-1.5">
                      {["Ep. 12 — Why PLG pricing fails", "Ep. 8 — Unit economics deep-dive", "Ep. 3 — Pricing page teardown"].map((ep) => (
                        <div key={ep} className="flex items-center gap-2 text-[11px] text-secondary/80">
                          <span className="w-1 h-1 rounded-full bg-accent/40 flex-shrink-0" />
                          <span className="truncate">{ep}</span>
                        </div>
                      ))}
                    </div>
                    <div className="text-[10px] text-stone/50 mt-2 text-right font-[family-name:var(--font-mono)]">7 results</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Card 4: Customer Interviews — Full width ─── */}
          <div className="md:col-span-12 group">
            <div className="relative bg-gradient-to-br from-surface/90 to-surface/60 border border-border rounded-[18px] overflow-hidden shadow-[0_8px_40px_rgba(0,0,0,0.25)] hover:border-accent/20 transition-all duration-400">
              <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr]">
                {/* Data viz side */}
                <div className="bg-bg-deep/80 border-b lg:border-b-0 lg:border-r border-border p-7 lg:p-9 relative overflow-hidden">
                  <div className="absolute inset-0 dot-grid opacity-20 pointer-events-none" />
                  <div className="relative">
                    <div className="text-[11px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-wider mb-6">Pattern Analysis — 15 interviews</div>
                    <div className="space-y-4">
                      {[
                        { label: "Onboarding confusion", count: 11, pct: 73 },
                        { label: "Pricing unclear", count: 8, pct: 53 },
                        { label: "Missing integrations", count: 6, pct: 40 },
                        { label: "Performance issues", count: 4, pct: 27 },
                      ].map((item) => (
                        <div key={item.label}>
                          <div className="flex items-center justify-between text-[12px] mb-2">
                            <span className="text-secondary">{item.label}</span>
                            <span className="text-stone font-[family-name:var(--font-mono)] text-[11px]">{item.count}/15</span>
                          </div>
                          <div className="h-2 bg-surface rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-accent/50 to-accent rounded-full transition-all duration-500"
                              style={{ width: `${item.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Chat prompt */}
                    <div className="mt-6 bg-surface/50 border border-border rounded-[10px] px-4 py-3 flex items-center gap-3">
                      <svg className="w-4 h-4 text-accent/50 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>
                      <span className="text-[13px] text-text/80 font-[family-name:var(--font-accent)] italic">&ldquo;What pain points keep coming up?&rdquo;</span>
                    </div>
                  </div>
                </div>
                {/* Text side */}
                <div className="p-8 lg:p-10 flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-accent/[0.08] border border-accent/15 rounded-full px-3 py-1 mb-5 w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent/70" />
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.12em]">Product</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-2xl lg:text-[28px] tracking-[-0.01em] mb-3 leading-tight">
                    Customer interviews &rarr;<br/>patterns in minutes.
                  </h3>
                  <p className="text-[15px] text-secondary leading-relaxed max-w-sm">
                    Ingest 15 customer calls. Ask one question across all of them. See what actually keeps coming up — not what you assumed.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* ─── Card 5: Learning — Bottom accent card ─── */}
          <div className="md:col-span-12 group">
            <div className="relative bg-surface/70 border border-border rounded-[18px] p-8 lg:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.2)] hover:border-accent/20 transition-all duration-400 overflow-hidden">
              {/* Warm ambient glow */}
              <div className="absolute bottom-0 left-[20%] w-[400px] h-[250px] bg-accent/[0.03] rounded-full blur-[100px] pointer-events-none" />

              <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.5fr] gap-8 lg:gap-12 relative">
                {/* Text */}
                <div className="flex flex-col justify-center">
                  <div className="inline-flex items-center gap-2 bg-surface-raised/60 border border-border rounded-full px-3 py-1 mb-5 w-fit">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400/70" />
                    <span className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-[0.12em]">Learning</span>
                  </div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-2xl lg:text-[28px] tracking-[-0.01em] mb-3 leading-tight">
                    One lecture. Five outputs.
                  </h3>
                  <p className="text-[15px] text-secondary leading-relaxed max-w-sm">
                    Run different Recipes on the same 90-minute recording. Brief for review, detailed for study, key quotes for your paper.
                  </p>
                </div>
                {/* Recipe tabs mockup */}
                <div className="relative">
                  <div className="bg-bg/70 border border-border rounded-[14px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.15)]">
                    {/* Tab bar */}
                    <div className="flex items-center gap-1 px-4 py-3 border-b border-border bg-surface/30 overflow-x-auto">
                      {[
                        { label: "Brief Summary", active: true },
                        { label: "Full Notes", active: false },
                        { label: "Study Questions", active: false },
                        { label: "Key Quotes", active: false },
                        { label: "Show Notes", active: false },
                      ].map((tab) => (
                        <button key={tab.label} className={`flex-shrink-0 text-[11px] font-[family-name:var(--font-mono)] px-3 py-1.5 rounded-[6px] transition-colors ${tab.active ? 'bg-accent/15 text-accent border border-accent/20' : 'text-stone hover:text-secondary'}`}>
                          {tab.label}
                        </button>
                      ))}
                    </div>
                    {/* Content */}
                    <div className="p-5 lg:p-6">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent/50 mt-2 flex-shrink-0" />
                          <p className="text-[13px] text-secondary leading-relaxed">The lecture introduces three competing models of attention allocation in cognitive load theory, with emphasis on the redundancy effect.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent/50 mt-2 flex-shrink-0" />
                          <p className="text-[13px] text-secondary leading-relaxed">Key distinction: intrinsic vs. extraneous load — the speaker argues most instructional design failures are extraneous.</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent/50 mt-2 flex-shrink-0" />
                          <p className="text-[13px] text-secondary leading-relaxed">Actionable takeaway: chunk information into 3–5 segments before testing recall.</p>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/50 flex items-center justify-between">
                        <span className="text-[10px] text-stone font-[family-name:var(--font-mono)]">Generated in 8s · Cognitive Psych 301 · Lecture 7</span>
                        <span className="text-[10px] text-accent/60 font-[family-name:var(--font-mono)]">Claude 3.5 Sonnet</span>
                      </div>
                    </div>
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
      description: "One Mac, full power.",
      href: "https://buy.polar.sh/polar_cl_OE9GPqVt3kxD5jh0SMy4QYZ2SUJNnPdrbBhkp410YT6",
    },
    {
      name: "Personal",
      price: 39,
      devices: 2,
      description: "Laptop + desktop.",
      highlighted: true,
      href: "https://buy.polar.sh/polar_cl_hz4vZjB1wqOHshCiCGTFAY3qxhWpgmwjvFNy44S5bou",
    },
    {
      name: "Extended",
      price: 49,
      devices: 3,
      description: "All your machines.",
      href: "https://buy.polar.sh/polar_cl_tGvATndAmHjDXxdUCUHqBJC4Ym8JVbNHet6PH2yTypO",
    },
  ];

  const features = [
    "All features included",
    "Lifetime updates",
    "No subscription",
    "BYOK — no API markup",
    "14-day free trial",
  ];

  return (
    <section id="pricing" className="px-6 py-32 relative overflow-hidden">
      {/* Atmospheric background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-accent/[0.025] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      <div className="max-w-4xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.2em] mb-4">Pricing</span>
          <h2 className="font-[family-name:var(--font-heading)] text-[clamp(32px,5vw,44px)] font-bold tracking-[-0.02em] mb-4">
            One-time purchase
          </h2>
          <p className="text-secondary text-base max-w-md mx-auto leading-relaxed">
            Every tier includes all features. Forever.<br className="hidden sm:block" />
            The only difference is how many Macs you own.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-[18px] p-7 transition-all duration-300 ${
                tier.highlighted
                  ? "bg-gradient-to-b from-surface/95 to-surface/80 border-2 border-accent/30 shadow-[0_8px_48px_rgba(217,119,87,0.12),0_0_0_1px_rgba(217,119,87,0.05)] scale-[1.02] md:-my-3"
                  : "bg-surface/60 border border-border hover:border-accent/15 shadow-[0_4px_24px_rgba(0,0,0,0.2)]"
              }`}
            >
              {/* Popular badge */}
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="text-[10px] font-semibold text-text bg-accent px-3 py-1 rounded-full shadow-[0_2px_12px_rgba(217,119,87,0.4)]">
                    Most popular
                  </span>
                </div>
              )}

              {/* Tier name + description */}
              <div className="mb-6">
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mb-1">
                  {tier.name}
                </h3>
                <p className="text-[13px] text-stone">{tier.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-[42px] font-[family-name:var(--font-heading)] font-bold tracking-tight leading-none">
                    ${tier.price}
                  </span>
                  <span className="text-[13px] text-stone font-[family-name:var(--font-mono)]">once</span>
                </div>
              </div>

              {/* Device visualization */}
              <div className="mb-7">
                <div className="flex items-center gap-2.5">
                  {Array.from({ length: tier.devices }).map((_, i) => (
                    <div key={i} className="w-9 h-9 rounded-[8px] bg-accent/10 border border-accent/20 flex items-center justify-center">
                      <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                  ))}
                  {Array.from({ length: 3 - tier.devices }).map((_, i) => (
                    <div key={i} className="w-9 h-9 rounded-[8px] bg-bg/40 border border-border/60 flex items-center justify-center">
                      <svg className="w-5 h-5 text-stone/20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
                      </svg>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-stone mt-2 font-[family-name:var(--font-mono)]">
                  {tier.devices} {tier.devices === 1 ? "Mac" : "Macs"} · Lifetime license
                </p>
              </div>

              {/* CTA */}
              <a
                href={tier.href}
                className={`mt-auto block text-center px-5 py-3.5 rounded-[12px] text-sm font-medium transition-all duration-200 ${
                  tier.highlighted
                    ? "bg-accent hover:bg-accent-hover text-text shadow-[0_2px_16px_rgba(217,119,87,0.3)] hover:shadow-[0_4px_24px_rgba(217,119,87,0.4)] hover:translate-y-[-1px]"
                    : "bg-surface-raised border border-border hover:border-accent/25 text-text hover:translate-y-[-1px]"
                }`}
              >
                Get {tier.name}
              </a>
            </div>
          ))}
        </div>

        {/* Features footer */}
        <div className="text-center">
          <div className="inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {features.map((feature) => (
              <span key={feature} className="flex items-center gap-2 text-[12px] text-stone">
                <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {feature}
              </span>
            ))}
          </div>
        </div>
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

/* ─── Open Source ─────────────────────────────────────────────── */

function OpenSource() {
  // Simulated contribution graph data (4 weeks × 7 days)
  const activityWeeks = [
    [0, 1, 0, 2, 1, 0, 0],
    [1, 2, 3, 1, 0, 1, 0],
    [0, 1, 2, 3, 2, 1, 0],
    [1, 0, 2, 1, 3, 2, 1],
    [0, 2, 1, 0, 2, 3, 1],
    [1, 3, 2, 1, 0, 1, 2],
    [2, 1, 0, 2, 1, 0, 1],
    [0, 1, 3, 2, 1, 2, 0],
    [1, 0, 1, 3, 2, 1, 1],
    [2, 1, 2, 0, 1, 3, 2],
    [0, 2, 1, 1, 0, 2, 1],
    [1, 0, 2, 3, 2, 1, 0],
    [0, 1, 1, 2, 3, 2, 1],
  ];

  function cellColor(level: number) {
    if (level === 0) return "bg-surface/50 border-border/40";
    if (level === 1) return "bg-accent/20 border-accent/15";
    if (level === 2) return "bg-accent/40 border-accent/25";
    return "bg-accent/70 border-accent/40 shadow-[0_0_4px_rgba(217,119,87,0.3)]";
  }

  return (
    <section id="source" className="px-6 py-32 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Atmospheric background */}
      <div className="absolute top-1/2 left-[20%] -translate-y-1/2 w-[500px] h-[500px] bg-accent/[0.02] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[10%] right-[10%] w-[300px] h-[300px] bg-accent/[0.025] rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-20">
          <span className="inline-block text-[11px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.2em] mb-4">Open Source</span>
          <h2 className="font-[family-name:var(--font-heading)] text-[clamp(32px,5vw,44px)] font-bold tracking-[-0.02em] mb-4">
            Built in the open
          </h2>
          <p className="text-secondary text-base max-w-lg mx-auto leading-relaxed">
            Audistill is fully open source. Inspect, modify, contribute —<br className="hidden sm:block" />
            your tool, your rules.
          </p>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-6">

          {/* Left: Contribution graph + repo stats */}
          <div className="bg-surface/60 border border-border rounded-[18px] p-7 lg:p-8 overflow-hidden relative hover:border-accent/15 transition-all duration-300">
            {/* Corner decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/[0.03] rounded-full blur-[50px] pointer-events-none" />

            <div className="relative">
              {/* Header with GitHub icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] bg-surface-raised border border-border flex items-center justify-center">
                    <svg className="w-5 h-5 text-text" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                    </svg>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-text font-[family-name:var(--font-mono)]">audistill/audistill</span>
                    <p className="text-[11px] text-stone mt-0.5">Main repository</p>
                  </div>
                </div>
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-stone/60 bg-surface-raised/60 px-2.5 py-1 rounded-full border border-border/60">MIT</span>
              </div>

              {/* Contribution graph */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-wider">Contribution Activity</span>
                  <span className="text-[10px] text-stone/60 font-[family-name:var(--font-mono)]">last 13 weeks</span>
                </div>
                <div className="flex gap-[3px] overflow-hidden">
                  {activityWeeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((level, di) => (
                        <div
                          key={di}
                          className={`w-[10px] h-[10px] rounded-[2px] border ${cellColor(level)} transition-colors duration-200`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Repo stats row */}
              <div className="grid grid-cols-4 gap-3">
                {[
                  { label: "Stars", value: "—", icon: "★" },
                  { label: "Forks", value: "—", icon: "⑂" },
                  { label: "Issues", value: "—", icon: "○" },
                  { label: "PRs", value: "—", icon: "⊕" },
                ].map((stat) => (
                  <div key={stat.label} className="text-center bg-bg/50 border border-border/50 rounded-[10px] px-2 py-3">
                    <span className="text-accent text-sm block mb-1">{stat.icon}</span>
                    <span className="text-[11px] text-stone font-[family-name:var(--font-mono)] block">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Philosophy + CTAs */}
          <div className="flex flex-col gap-5">

            {/* Why open source card */}
            <div className="flex-1 bg-surface/60 border border-border rounded-[18px] p-7 hover:border-accent/15 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 diagonal-lines opacity-[0.03] pointer-events-none" />
              <div className="relative">
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mb-4">Why open source?</h3>
                <div className="space-y-3.5">
                  {[
                    { title: "Verify privacy claims", desc: "Inspect every line. Confirm nothing phones home." },
                    { title: "Customize freely", desc: "Add integrations, tweak recipes, shape it to your workflow." },
                    { title: "Build from source", desc: "Don't trust binaries? Compile it yourself." },
                    { title: "Contribute back", desc: "Fix a bug, add a feature, improve docs — PRs welcome." },
                  ].map((item) => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-accent/60 mt-2 flex-shrink-0" />
                      <div>
                        <span className="text-[13px] text-text font-medium block">{item.title}</span>
                        <span className="text-[12px] text-stone leading-relaxed">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Star + Clone CTAs */}
            <div className="bg-gradient-to-br from-surface/90 to-surface/60 border border-accent/20 rounded-[18px] p-6 shadow-[0_4px_32px_rgba(217,119,87,0.06)] hover:border-accent/30 transition-all duration-300">
              <div className="flex flex-col gap-3">
                <a
                  href="https://github.com/audistill/audistill"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2.5 px-5 py-3.5 rounded-[12px] bg-surface-raised hover:bg-surface border border-border hover:border-accent/25 text-text text-sm font-medium transition-all duration-200 hover:translate-y-[-1px] group"
                >
                  <svg className="w-5 h-5 text-secondary group-hover:text-text transition-colors" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>Star on GitHub</span>
                  <svg className="w-3.5 h-3.5 text-accent/70" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </a>
                {/* Clone command */}
                <div className="bg-bg/70 border border-border rounded-[10px] px-4 py-3 font-[family-name:var(--font-mono)]">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-stone"><span className="text-accent/70 select-none">$ </span><span className="text-secondary">git clone</span> <span className="text-text/80">https://github.com/audistill/audistill.git</span></span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom banner: source-available model explanation */}
        <div className="mt-12 text-center">
          <div className="inline-flex items-center gap-3 bg-surface/40 border border-border rounded-full px-5 py-2.5">
            <svg className="w-4 h-4 text-accent/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span className="text-[12px] text-secondary leading-relaxed">
              Free to build & run yourself. The paid download supports development and gives you auto-updates + a signed binary.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Install / Final CTA ─────────────────────────────────────── */

function Install() {
  return (
    <section id="install" className="px-6 py-32 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Atmospheric background — large warm glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-accent/[0.035] rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[20%] left-[10%] w-[300px] h-[300px] bg-accent/[0.02] rounded-full blur-[80px] pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        {/* Section header */}
        <div className="text-center mb-16">
          <span className="inline-block text-[11px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-[0.2em] mb-4">Get Started</span>
          <h2 className="font-[family-name:var(--font-heading)] text-[clamp(32px,5vw,48px)] font-bold tracking-[-0.02em] mb-4">
            Take it from here.
          </h2>
          <p className="text-secondary text-base max-w-md mx-auto leading-relaxed">
            14 days free. No credit card. Pick your path.
          </p>
        </div>

        {/* Three install paths */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-14">

          {/* Path 1: Download DMG — Primary/Hero */}
          <div className="relative bg-gradient-to-b from-surface/95 to-surface/80 border-2 border-accent/30 rounded-[18px] p-7 shadow-[0_8px_48px_rgba(217,119,87,0.12),0_0_0_1px_rgba(217,119,87,0.05)] md:scale-[1.03] md:-my-2 flex flex-col">
            {/* Recommended badge */}
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="text-[10px] font-semibold text-text bg-accent px-3 py-1 rounded-full shadow-[0_2px_12px_rgba(217,119,87,0.4)]">
                Recommended
              </span>
            </div>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-[10px] bg-accent/15 border border-accent/25 flex items-center justify-center">
                <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[15px]">Download</h3>
                <p className="text-[11px] text-stone">Signed & notarized .dmg</p>
              </div>
            </div>

            <p className="text-[13px] text-secondary leading-relaxed mb-6 flex-1">
              One-click install. Auto-updates. Supports development.
            </p>

            <a
              href="#"
              className="block text-center bg-accent hover:bg-accent-hover active:bg-accent-pressed text-text text-sm font-medium px-6 py-3.5 rounded-[12px] transition-all duration-200 shadow-[0_2px_12px_rgba(217,119,87,0.25)] hover:shadow-[0_4px_20px_rgba(217,119,87,0.35)] hover:translate-y-[-1px]"
            >
              Download for Mac
            </a>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-stone/70 font-[family-name:var(--font-mono)]">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              <span>Notarized by Apple</span>
            </div>
          </div>

          {/* Path 2: Homebrew */}
          <div className="bg-surface/60 border border-border rounded-[18px] p-7 hover:border-accent/20 transition-all duration-300 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-[10px] bg-surface-raised border border-border flex items-center justify-center">
                <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 17 10 11 4 5" />
                  <line x1="12" y1="19" x2="20" y2="19" />
                </svg>
              </div>
              <div>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[15px]">Homebrew</h3>
                <p className="text-[11px] text-stone">For terminal lovers</p>
              </div>
            </div>

            <p className="text-[13px] text-secondary leading-relaxed mb-6 flex-1">
              Install and update via Homebrew Cask. Same signed binary.
            </p>

            <div className="mb-3">
              <BrewCommand />
            </div>

            <div className="mt-auto flex items-center justify-center gap-1.5 text-[10px] text-stone/70 font-[family-name:var(--font-mono)]">
              <span className="text-accent/60">$</span>
              <span>brew upgrade to update</span>
            </div>
          </div>

          {/* Path 3: Build from Source */}
          <div className="bg-surface/60 border border-border rounded-[18px] p-7 hover:border-accent/20 transition-all duration-300 flex flex-col relative overflow-hidden">
            {/* Subtle diagonal texture */}
            <div className="absolute inset-0 diagonal-lines opacity-[0.04] pointer-events-none" />

            <div className="relative flex flex-col h-full">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[10px] bg-surface-raised border border-border flex items-center justify-center">
                  <svg className="w-5 h-5 text-secondary" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-[15px]">Build from Source</h3>
                  <p className="text-[11px] text-stone">Full control</p>
                </div>
              </div>

              <p className="text-[13px] text-secondary leading-relaxed mb-6 flex-1">
                Clone, inspect, build. Free forever. No telemetry, no limits.
              </p>

              <a
                href="https://github.com/audistill/audistill"
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center bg-surface-raised hover:bg-surface border border-border hover:border-accent/25 text-text text-sm font-medium px-6 py-3.5 rounded-[12px] transition-all duration-200 hover:translate-y-[-1px]"
              >
                View on GitHub
              </a>

              <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-stone/70 font-[family-name:var(--font-mono)]">
                <span>MIT License</span>
              </div>
            </div>
          </div>
        </div>

        {/* System requirements strip */}
        <div className="bg-surface/40 border border-border rounded-[14px] px-6 py-5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[8px] bg-surface-raised border border-border flex items-center justify-center">
                <svg className="w-4 h-4 text-stone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <line x1="8" y1="21" x2="16" y2="21" />
                  <line x1="12" y1="17" x2="12" y2="21" />
                </svg>
              </div>
              <span className="text-[12px] text-stone font-[family-name:var(--font-mono)] uppercase tracking-wider">System Requirements</span>
            </div>
            <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2">
              {[
                { label: "Apple Silicon", detail: "M1 or later" },
                { label: "macOS", detail: "13 Ventura+" },
                { label: "Storage", detail: "~200 MB" },
              ].map((req) => (
                <div key={req.label} className="flex items-center gap-2 text-[12px]">
                  <span className="text-secondary">{req.label}</span>
                  <span className="text-stone/60 font-[family-name:var(--font-mono)] text-[11px] bg-bg/50 px-2 py-0.5 rounded">{req.detail}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
