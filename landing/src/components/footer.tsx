export function Footer() {
  return (
    <footer className="px-6 py-10 border-t border-border relative overflow-hidden">
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[100px] bg-accent/[0.03] rounded-full blur-[60px] pointer-events-none" />

      <div className="max-w-5xl mx-auto relative">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-xs text-stone">
          {/* Left: brand */}
          <div className="flex items-center gap-2.5">
            <img src="/icon.png" alt="Audistill" className="w-5 h-5 rounded-md" />
            <span className="font-[family-name:var(--font-heading)] font-medium text-sm text-text">
              Audistill
            </span>
            <span className="text-border">&middot;</span>
            <span className="text-[11px] text-stone/70 font-[family-name:var(--font-mono)]">Open Source</span>
          </div>

          {/* Center: section links */}
          <div className="flex items-center gap-5">
            <a href="/#features" className="hover:text-accent transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-accent transition-colors">Pricing</a>
            <a href="/#faq" className="hover:text-accent transition-colors">FAQ</a>
            <a href="/#install" className="hover:text-accent transition-colors">Install</a>
          </div>

          {/* Right: GitHub + legal */}
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/audistill/audistill"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 hover:text-accent transition-colors"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </a>
            <span className="text-border">&middot;</span>
            <a href="/terms" className="hover:text-accent transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-accent transition-colors">Privacy</a>
            <span className="text-border">&middot;</span>
            <a href="mailto:info@audistill.com" className="hover:text-accent transition-colors">
              info@audistill.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
