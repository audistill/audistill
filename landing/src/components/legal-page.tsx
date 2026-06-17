interface LegalPageProps {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}

export function LegalPage({ title, lastUpdated, children }: LegalPageProps) {
  return (
    <main className="min-h-screen px-6 pt-32 pb-20">
      <article className="max-w-2xl mx-auto">
        <header className="mb-12">
          <h1 className="font-[family-name:var(--font-heading)] text-[clamp(28px,4vw,40px)] font-bold tracking-[-0.02em] mb-3">
            {title}
          </h1>
          <p className="text-sm text-stone font-[family-name:var(--font-mono)]">
            Last updated: {lastUpdated}
          </p>
        </header>

        <div className="legal-prose space-y-8 text-secondary text-[15px] leading-relaxed">
          {children}
        </div>
      </article>
    </main>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="font-[family-name:var(--font-heading)] text-lg font-semibold text-text">
        {title}
      </h2>
      {children}
    </section>
  );
}
