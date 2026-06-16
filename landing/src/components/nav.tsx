import { GitHubStars } from "./github-stars";

export function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-bg/70 backdrop-blur-2xl border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2.5">
          <img src="/icon.png" alt="Audistill" className="w-7 h-7 rounded-lg" />
          <span className="font-[family-name:var(--font-heading)] font-semibold text-base tracking-tight">
            Audistill
          </span>
        </a>
        <div className="flex items-center gap-8">
          <div className="hidden md:flex items-center gap-6 text-[13px] text-secondary">
            <a href="/#features" className="hover:text-text transition-colors duration-200">Features</a>
            <a href="/#pricing" className="hover:text-text transition-colors duration-200">Pricing</a>
            <a href="/#faq" className="hover:text-text transition-colors duration-200">FAQ</a>
          </div>
          <div className="flex items-center gap-4">
            <GitHubStars fallbackText="GitHub" className="hidden md:inline-flex text-[12px]" />
            <a
              href="/#install"
              className="bg-accent/10 hover:bg-accent/20 text-accent text-[13px] font-medium px-4 py-2 rounded-[10px] transition-all duration-200 border border-accent/20 shadow-[0_0_12px_rgba(217,119,87,0.1)]"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
