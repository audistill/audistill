import { GitHubStars } from "./github-stars";

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
          </div>

          {/* Center: section links */}
          <div className="flex items-center gap-5">
            <a href="/#features" className="hover:text-accent transition-colors">Features</a>
            <a href="/#pricing" className="hover:text-accent transition-colors">Pricing</a>
            <a href="/#faq" className="hover:text-accent transition-colors">FAQ</a>
            <a href="/#install" className="hover:text-accent transition-colors">Install</a>
          </div>

          {/* Right: legal + GitHub + contact */}
          <div className="flex items-center gap-4">
            <a href="/terms" className="hover:text-accent transition-colors">Terms</a>
            <a href="/privacy" className="hover:text-accent transition-colors">Privacy</a>
            <GitHubStars fallbackText="Source Code" className="text-xs" />
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
