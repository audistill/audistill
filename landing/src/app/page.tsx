export default function Home() {
  return (
    <>
      <Nav />
      <Hero />
      <Pipeline />
      <Features />
      <Pricing />
      <Install />
      <Footer />
    </>
  );
}

/* ─── Navigation ──────────────────────────────────────────────── */

function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/70 backdrop-blur-2xl border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-accent/15 flex items-center justify-center shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]">
            <div className="w-3 h-3 rounded-full bg-accent shadow-[0_0_8px_rgba(217,119,87,0.4)]" />
          </div>
          <span className="font-[family-name:var(--font-heading)] font-semibold text-base tracking-tight">
            Audistill
          </span>
        </a>
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6 text-[13px] text-secondary">
            <a href="#features" className="hover:text-text transition-colors duration-200">Features</a>
            <a href="#pricing" className="hover:text-text transition-colors duration-200">Pricing</a>
            <a href="#install" className="hover:text-text transition-colors duration-200">Install</a>
          </div>
          <a
            href="#install"
            className="bg-accent/10 hover:bg-accent/20 text-accent text-[13px] font-medium px-4 py-2 rounded-[10px] transition-all duration-200 border border-accent/20 shadow-[0_0_12px_rgba(217,119,87,0.1)]"
          >
            Download
          </a>
        </div>
      </div>
    </nav>
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
          <span className="text-xs text-secondary font-medium">Built exclusively for Apple Silicon</span>
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up delay-100 font-[family-name:var(--font-heading)] text-[clamp(40px,6vw,68px)] font-bold leading-[1.05] tracking-[-0.02em] mb-5">
          One hour.{" "}
          <span className="shimmer-accent text-transparent">Two minutes.</span>
        </h1>

        {/* Subheadline */}
        <p className="animate-fade-up delay-200 text-lg text-secondary max-w-xl mx-auto leading-relaxed mb-3">
          Audistill transcribes audio at 30-50x realtime on Apple Silicon — then distills it into structured knowledge with any model you choose.
        </p>
        <p className="animate-fade-up delay-200 text-sm text-stone mb-10">
          Your machine. Your models. Your knowledge base.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
          {/* Terminal block */}
          <div className="group relative bg-surface/80 backdrop-blur border border-border hover:border-accent/30 rounded-[12px] px-5 py-3 transition-all duration-300 cursor-pointer shadow-[0_4px_16px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.03)]">
            <code className="font-[family-name:var(--font-mono)] text-sm text-secondary group-hover:text-text transition-colors">
              <span className="text-accent">$</span>{" "}
              brew install --cask audistill/tap/audistill
            </code>
          </div>
          <span className="text-xs text-stone hidden sm:block">or</span>
          <a
            href="#install"
            className="bg-accent hover:bg-accent-hover active:bg-accent-pressed text-text text-sm font-medium px-6 py-3 rounded-[12px] transition-all duration-200 shadow-[0_2px_12px_rgba(217,119,87,0.25),0_4px_24px_rgba(217,119,87,0.15)] hover:shadow-[0_4px_20px_rgba(217,119,87,0.35),0_8px_40px_rgba(217,119,87,0.2)] hover:translate-y-[-1px]"
          >
            Download DMG
          </a>
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

/* ─── Pipeline / How it Works — Schematic Blueprint ───────────── */

function Pipeline() {
  return (
    <section className="px-6 py-28 relative section-glow overflow-hidden">
      {/* Blueprint grid background — denser than usual */}
      <div className="absolute inset-0 dot-grid opacity-30 pointer-events-none" />
      <div className="absolute inset-0 diagonal-lines opacity-20 pointer-events-none" />

      <div className="max-w-4xl mx-auto relative">
        <div className="text-center mb-16">
          <span className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-[0.2em] block mb-3">System Architecture</span>
          <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
            How it works
          </h2>
          <p className="text-secondary">From raw audio to searchable knowledge. All on your machine.</p>
        </div>

        {/* ═══ THE SCHEMATIC ═══ */}
        <div className="relative">

          {/* ─── Stage 1 & 2: Input + Processing (horizontal pair) ─── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 relative">
            {/* Connecting pipe between 1 and 2 */}
            <div className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 z-10">
              <div className="h-px bg-gradient-to-r from-stone/30 to-accent/40" />
              <div className="absolute top-1/2 right-0 -translate-y-1/2 w-0 h-0 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent border-l-[5px] border-l-accent/40" />
            </div>

            {/* Stage 1: Ingest */}
            <div className="bg-surface/70 border border-border rounded-[12px] p-6 md:rounded-r-none md:border-r-0 relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-[8px] bg-bg border border-border flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm">Ingest</h3>
                  <span className="text-[10px] text-stone font-[family-name:var(--font-mono)]">INPUT</span>
                </div>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed mb-3">
                Bring in audio from anywhere — one app handles it all.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {["Files", "YouTube", "RSS", "URLs"].map((s) => (
                  <span key={s} className="text-[10px] font-[family-name:var(--font-mono)] text-stone bg-bg/60 px-2 py-1 rounded border border-border">
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Stage 2: Transcribe */}
            <div className="bg-surface/70 border border-border rounded-[12px] p-6 md:rounded-l-none relative">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-[8px] bg-bg border border-border flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
                    <path d="M19 10v2a7 7 0 01-14 0v-2" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-sm">Transcribe</h3>
                  <span className="text-[10px] text-stone font-[family-name:var(--font-mono)]">ON-DEVICE</span>
                </div>
              </div>
              <p className="text-[13px] text-secondary leading-relaxed mb-3">
                On-device speech-to-text at 30-50x realtime.
              </p>
              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-accent">⚡</span> 1 hour → under 2 minutes
                </div>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-accent">◆</span> Apple Silicon · Parakeet ASR
                </div>
                <div className="flex items-center gap-2 text-secondary">
                  <span className="text-accent">●</span> Never leaves your machine
                </div>
              </div>
            </div>
          </div>

          {/* ─── Vertical connector: pipe down into Distill ─── */}
          <div className="flex justify-center py-3">
            <div className="flex flex-col items-center">
              <div className="w-px h-6 bg-gradient-to-b from-accent/30 to-accent/50" />
              <div className="w-2 h-2 rounded-full bg-accent/50 shadow-[0_0_8px_rgba(217,119,87,0.3)]" />
              <div className="w-px h-6 bg-gradient-to-b from-accent/50 to-accent/30" />
            </div>
          </div>

          {/* ─── Stage 3: Distill — THE EXPANSION ─── */}
          <div className="relative">
            {/* Main Distill container */}
            <div className="bg-surface/80 border border-accent/15 rounded-[14px] p-6 relative overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.15),0_0_0_1px_rgba(217,119,87,0.05)]">
              {/* Corner schematic decoration */}
              <div className="absolute top-3 right-3 text-[9px] font-[family-name:var(--font-mono)] text-stone/30 uppercase">PROC.03</div>
              <div className="absolute top-0 right-0 w-16 h-16">
                <svg className="w-full h-full opacity-10" viewBox="0 0 64 64"><path d="M64 0v16h-16M48 16v32h-32v16" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-accent"/></svg>
              </div>

              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-[8px] bg-accent/10 border border-accent/15 flex items-center justify-center shadow-[0_0_12px_rgba(217,119,87,0.08)]">
                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg">Distill</h3>
                  <span className="text-[10px] text-accent font-[family-name:var(--font-mono)]">INTELLIGENCE LAYER</span>
                </div>
              </div>
              <p className="text-sm text-secondary leading-relaxed mb-5 max-w-lg">
                Transform raw transcripts into structured, usable knowledge. Three tools, one goal:
              </p>

              {/* Branching sub-features — three columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 relative">
                {/* Branch lines (desktop) */}
                <div className="hidden md:block absolute -top-5 left-1/6 w-px h-5 bg-accent/20" />
                <div className="hidden md:block absolute -top-5 left-1/2 w-px h-5 bg-accent/20" />
                <div className="hidden md:block absolute -top-5 right-1/6 w-px h-5 bg-accent/20" />

                {/* Presets */}
                <div className="bg-bg/60 border border-border rounded-[10px] p-4 hover:border-accent/20 transition-all duration-300 group">
                  <div className="w-7 h-7 rounded-[6px] bg-accent/10 border border-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
                    <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M7 7h10M7 12h10M7 17h6" />
                    </svg>
                  </div>
                  <h4 className="font-[family-name:var(--font-heading)] font-medium text-sm mb-1.5">Presets</h4>
                  <p className="text-[12px] text-secondary leading-relaxed mb-2.5">
                    Define how content gets shaped. Set once, run on any transcript.
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {["Brief", "Detailed", "Full", "+"].map((p) => (
                      <span key={p} className="text-[9px] font-[family-name:var(--font-mono)] text-stone bg-surface px-1.5 py-0.5 rounded border border-border">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Chat */}
                <div className="bg-bg/60 border border-border rounded-[10px] p-4 hover:border-accent/20 transition-all duration-300 group">
                  <div className="w-7 h-7 rounded-[6px] bg-accent/10 border border-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
                    <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <h4 className="font-[family-name:var(--font-heading)] font-medium text-sm mb-1.5">Chat</h4>
                  <p className="text-[12px] text-secondary leading-relaxed">
                    Ask questions directly. <span className="font-[family-name:var(--font-accent)] italic text-stone">&ldquo;What did they say about pricing?&rdquo;</span>
                  </p>
                </div>

                {/* Documents */}
                <div className="bg-bg/60 border border-border rounded-[10px] p-4 hover:border-accent/20 transition-all duration-300 group">
                  <div className="w-7 h-7 rounded-[6px] bg-accent/10 border border-accent/10 flex items-center justify-center mb-3 group-hover:bg-accent/15 transition-colors">
                    <svg className="w-3.5 h-3.5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <h4 className="font-[family-name:var(--font-heading)] font-medium text-sm mb-1.5">Documents</h4>
                  <p className="text-[12px] text-secondary leading-relaxed">
                    Multiple outputs per episode. Persistent, editable, copyable.
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-stone mt-4 font-[family-name:var(--font-mono)]">
                → Same recording, different outputs. No re-processing needed.
              </p>
            </div>
          </div>

          {/* ─── Vertical connector: pipe down into Knowledge ─── */}
          <div className="flex justify-center py-3">
            <div className="flex flex-col items-center">
              <div className="w-px h-4 bg-gradient-to-b from-accent/30 to-accent/60" />
              <div className="w-3 h-3 rounded-full bg-accent/70 shadow-[0_0_12px_rgba(217,119,87,0.4)] pulse-soft" />
              <div className="w-px h-4 bg-gradient-to-b from-accent/60 to-accent/40" />
            </div>
          </div>

          {/* ─── Stage 4: Knowledge Base — THE DESTINATION ─── */}
          <div className="relative">
            {/* Energy pooling glow */}
            <div className="absolute inset-0 bg-accent/[0.03] rounded-[14px] blur-[20px]" />

            <div className="relative bg-gradient-to-br from-accent/[0.08] via-accent/[0.04] to-transparent border border-accent/25 rounded-[14px] p-7 shadow-[0_4px_32px_rgba(217,119,87,0.1),inset_0_1px_0_rgba(255,255,255,0.03)] glow-warm-strong">
              {/* Schematic label */}
              <div className="absolute top-3 right-4 text-[9px] font-[family-name:var(--font-mono)] text-accent/40 uppercase tracking-wider">OUTPUT</div>

              <div className="flex items-center gap-3 mb-3">
                <div className="w-11 h-11 rounded-[10px] bg-accent/15 border border-accent/25 flex items-center justify-center shadow-[0_0_20px_rgba(217,119,87,0.12)]">
                  <svg className="w-5 h-5 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a8 8 0 018 8c0 3.4-2.1 6.3-5 7.5V20a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2.5C6.1 16.3 4 13.4 4 10a8 8 0 018-8z" />
                    <path d="M10 14.5a2 2 0 012-2 2 2 0 012 2" />
                    <line x1="12" y1="6" x2="12" y2="8" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg text-accent">
                    Your Knowledge Base
                  </h3>
                  <span className="text-[10px] text-accent/60 font-[family-name:var(--font-mono)]">PERSISTENT · SEARCHABLE · LOCAL</span>
                </div>
              </div>

              <p className="text-sm text-secondary leading-relaxed mb-4">
                A searchable library of everything you&apos;ve heard.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex items-center gap-2 text-[12px] bg-bg/40 rounded-[8px] px-3 py-2.5 border border-accent/10">
                  <svg className="w-3.5 h-3.5 text-accent/70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span className="text-secondary">Full-text search</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] bg-bg/40 rounded-[8px] px-3 py-2.5 border border-accent/10">
                  <svg className="w-3.5 h-3.5 text-accent/70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  <span className="text-secondary">Nested folders</span>
                </div>
                <div className="flex items-center gap-2 text-[12px] bg-bg/40 rounded-[8px] px-3 py-2.5 border border-accent/10">
                  <svg className="w-3.5 h-3.5 text-accent/70 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                  <span className="text-secondary">Copy anywhere</span>
                </div>
              </div>

              <p className="text-[12px] text-accent/60 mt-4 font-[family-name:var(--font-accent)] italic">
                It compounds — the more you add, the more useful it gets.
              </p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

/* ─── Features / Use Cases ────────────────────────────────────── */

function Features() {
  return (
    <section id="features" className="px-6 py-28 relative overflow-hidden">
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

          {/* ═══ Card 1: Conference Talks — TERMINAL/CODE aesthetic ═══ */}
          <div className="card-glow bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.2fr]">
              {/* Copy side */}
              <div className="p-7 flex flex-col justify-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest mb-3">Developer</span>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2">
                  12 conference talks. One search bar.
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Paste YouTube links from WWDC, JSConf, Strange Loop. Build a searchable library of every talk you watched.
                </p>
              </div>
              {/* Visual side — fake terminal/search */}
              <div className="bg-bg-deep border-l border-border p-5 font-[family-name:var(--font-mono)] text-xs">
                {/* Search bar */}
                <div className="bg-surface border border-border rounded-[8px] px-3 py-2 mb-3 flex items-center gap-2">
                  <svg className="w-3.5 h-3.5 text-stone" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <span className="text-accent">React Server Components</span>
                  <span className="text-stone ml-auto">8 episodes</span>
                </div>
                {/* Results */}
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
                <div className="text-stone/50 text-[10px] mt-2 text-right">↑ found across 6 months of talks</div>
              </div>
            </div>
          </div>

          {/* ═══ Cards 2+3: Side by side ═══ */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* ═══ Card 2: Meetings — CLEAN/MINIMAL task-manager aesthetic ═══ */}
            <div className="card-glow bg-surface border border-border rounded-[14px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300">
              <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest">Meetings</span>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mt-2 mb-2">
                Three meetings today. Zero lost action items.
              </h3>
              <p className="text-sm text-secondary leading-relaxed mb-5">
                Drop in the recording. Get structured decisions and action items in seconds.
              </p>
              {/* Mini task list visual */}
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
                      <span className="text-[10px] text-stone ml-2">— {item.who}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ═══ Card 3: Podcasts — LIBRARY/WARM stacked aesthetic ═══ */}
            <div className="card-glow bg-surface border border-border rounded-[14px] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300 relative overflow-hidden">
              {/* Warm overlay */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/[0.04] rounded-full blur-[50px]" />

              <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest relative">Research</span>
              <h3 className="font-[family-name:var(--font-heading)] font-semibold text-lg mt-2 mb-2 relative">
                30 podcast episodes. Your personal research assistant.
              </h3>
              <p className="text-sm text-secondary leading-relaxed mb-5 relative">
                Subscribe to feeds. Auto-ingest episodes. Search across months of listening.
              </p>
              {/* Stacked files visual */}
              <div className="relative h-36">
                {/* Background cards (stacked) */}
                <div className="absolute bottom-0 left-3 right-3 h-24 bg-surface-raised/50 border border-border/40 rounded-[8px] rotate-[-1deg]" />
                <div className="absolute bottom-1 left-1.5 right-1.5 h-24 bg-surface-raised/70 border border-border/50 rounded-[8px] rotate-[0.5deg]" />
                {/* Top card */}
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

          {/* ═══ Card 4: Customer Interviews — DATA/ANALYTICAL aesthetic ═══ */}
          <div className="card-glow bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300">
            <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
              {/* Visual side — pattern/data */}
              <div className="bg-bg-deep border-r border-border p-6 relative overflow-hidden">
                <div className="absolute inset-0 dot-grid opacity-30" />
                <div className="relative">
                  <div className="text-[10px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-wider mb-4">Pattern Analysis — 15 interviews</div>
                  {/* Mini bar chart / pattern visual */}
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
                  {/* Chat query */}
                  <div className="mt-4 bg-surface/60 border border-border rounded-[8px] px-3 py-2">
                    <span className="text-[10px] text-stone">Chat:</span>
                    <span className="text-[11px] text-text ml-1 font-[family-name:var(--font-accent)] italic">&ldquo;What pain points keep coming up?&rdquo;</span>
                  </div>
                </div>
              </div>
              {/* Copy side */}
              <div className="p-7 flex flex-col justify-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest mb-3">Product</span>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2">
                  Customer interviews → patterns in minutes.
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Ingest 15 customer calls. Ask one question across all of them. See what actually keeps coming up — not what you assumed.
                </p>
              </div>
            </div>
          </div>

          {/* ═══ Card 5: Lecture — LAYERED/STACKED fan-out aesthetic ═══ */}
          <div className="card-glow bg-surface border border-border rounded-[14px] p-7 shadow-[0_4px_20px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)] hover:border-accent/20 transition-all duration-300 relative overflow-hidden">
            <div className="absolute bottom-0 left-[30%] w-[300px] h-[200px] bg-accent/[0.03] rounded-full blur-[80px] pointer-events-none" />

            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-6 relative">
              {/* Copy side */}
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-[family-name:var(--font-mono)] text-accent uppercase tracking-widest mb-3">Learning</span>
                <h3 className="font-[family-name:var(--font-heading)] font-semibold text-xl mb-2">
                  One lecture. Five outputs.
                </h3>
                <p className="text-sm text-secondary leading-relaxed">
                  Run different presets on the same 90-minute recording. Brief for review, detailed for study, key quotes for your paper.
                </p>
              </div>
              {/* Visual side — fanned-out tabs */}
              <div className="relative h-48 md:h-auto">
                {/* The fanned document cards */}
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
                {/* Top card — fully visible */}
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

        {/* Single unified pricing block — like a config panel */}
        <div className="bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.15),inset_0_1px_0_rgba(255,255,255,0.02)]">
          {/* Header bar */}
          <div className="px-6 py-4 border-b border-border bg-bg/40 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_6px_rgba(217,119,87,0.4)]" />
              <span className="text-[11px] font-[family-name:var(--font-mono)] text-stone uppercase tracking-wider">License Configuration</span>
            </div>
            <span className="text-[11px] text-accent font-[family-name:var(--font-mono)]">14-day free trial</span>
          </div>

          {/* Tier rows */}
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
                {/* Highlighted indicator */}
                {tier.highlighted && (
                  <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-accent rounded-r-full" />
                )}

                {/* Tier name + devices */}
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

                {/* Price */}
                <div className="text-right mr-4">
                  <span className="text-2xl font-[family-name:var(--font-heading)] font-bold tracking-tight">
                    ${tier.price}
                  </span>
                  <span className="text-[11px] text-stone ml-1">once</span>
                </div>

                {/* CTA */}
                <a
                  href={tier.href}
                  className={`flex-shrink-0 px-5 py-2.5 rounded-[10px] text-sm font-medium transition-all duration-200 ${
                    tier.highlighted
                      ? "bg-accent hover:bg-accent-hover text-text shadow-[0_2px_12px_rgba(217,119,87,0.25)] hover:shadow-[0_4px_16px_rgba(217,119,87,0.35)] hover:translate-y-[-1px]"
                      : "bg-surface-raised border border-border hover:border-accent/20 text-text"
                  }`}
                >
                  Buy
                </a>
              </div>
            ))}
          </div>

          {/* Footer — what's included */}
          <div className="px-6 py-4 border-t border-border bg-bg/40">
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[11px] text-stone">
              <span className="flex items-center gap-1.5">
                <span className="text-accent">✓</span> All features included
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">✓</span> Lifetime updates
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">✓</span> No subscription
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-accent">✓</span> BYOK — no API markup
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Install ─────────────────────────────────────────────────── */

function Install() {
  return (
    <section id="install" className="px-6 py-28 relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />

      {/* Background shape */}
      <div className="geo-ring geo-ring-sm bottom-[20%] right-[10%] opacity-30 animate-float-slow" />

      <div className="max-w-3xl mx-auto text-center relative">
        <h2 className="font-[family-name:var(--font-heading)] text-[36px] font-semibold mb-3">
          Get started
        </h2>
        <p className="text-secondary text-sm mb-10">
          macOS 14+ (Sonoma) · Apple Silicon (M1 / M2 / M3 / M4)
        </p>

        {/* Terminal install block */}
        <div className="inline-block text-left relative">
          {/* Glow behind terminal */}
          <div className="absolute inset-2 bg-accent/[0.04] rounded-[16px] blur-[30px]" />

          <div className="relative glow-warm-strong">
            <div className="bg-surface border border-border rounded-[14px] overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.3),0_0_0_1px_rgba(255,255,255,0.02)]">
              {/* Terminal titlebar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border bg-gradient-to-b from-surface-raised/60 to-surface/60">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]/80 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#febc2e]/80 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28c840]/80 shadow-[inset_0_-1px_1px_rgba(0,0,0,0.2)]" />
                </div>
                <span className="ml-2 text-[11px] text-stone font-[family-name:var(--font-mono)]">Terminal</span>
              </div>
              {/* Terminal body */}
              <div className="px-6 py-5 font-[family-name:var(--font-mono)] text-sm space-y-3">
                <div>
                  <span className="text-stone/60"># install via homebrew (recommended)</span>
                </div>
                <div className="flex items-center">
                  <span className="text-accent">$</span>
                  <span className="ml-2 text-text">brew install --cask audistill/tap/audistill</span>
                  <span className="cursor-blink text-accent ml-1 text-base">▎</span>
                </div>
                <div className="pt-2 border-t border-border/50">
                  <span className="text-stone/40 text-xs"># or download directly</span>
                </div>
                <div>
                  <span className="text-accent">$</span>
                  <span className="ml-2 text-stone/70">open https://github.com/audistill/releases/latest</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-3">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-border" />
          <span className="text-xs text-stone">or</span>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-border" />
        </div>

        <a
          href="#"
          className="mt-5 inline-flex items-center gap-2 text-sm text-secondary hover:text-accent transition-all duration-200 group"
        >
          <svg className="w-4 h-4 group-hover:translate-y-[1px] transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Audistill-0.1.0-arm64.dmg
        </a>
      </div>
    </section>
  );
}

/* ─── Footer ──────────────────────────────────────────────────── */

function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-border relative overflow-hidden">
      {/* Subtle bottom glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[100px] bg-accent/[0.03] rounded-full blur-[60px] pointer-events-none" />

      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone relative">
        <div className="flex items-center gap-2.5">
          <div className="w-5 h-5 rounded-md bg-accent/15 flex items-center justify-center shadow-[0_0_8px_rgba(217,119,87,0.1)]">
            <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_4px_rgba(217,119,87,0.4)]" />
          </div>
          <span className="font-[family-name:var(--font-heading)] font-medium text-sm text-text">
            Audistill
          </span>
        </div>
        <div className="flex items-center gap-6">
          <a href="mailto:info@audistill.com" className="hover:text-accent transition-colors">
            info@audistill.com
          </a>
          <span className="text-border">·</span>
          <span>Built for Apple Silicon</span>
        </div>
      </div>
    </footer>
  );
}
