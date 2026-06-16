import { fetchGitHubStars, formatStarCount } from "@/lib/github-stars";

type GitHubStarsVariant = "default" | "compact" | "button";

interface GitHubStarsProps {
  /** Visual variant: "default" (icon + count), "compact" (smaller), "button" (CTA style) */
  variant?: GitHubStarsVariant;
  /** Text shown when star count is unavailable */
  fallbackText?: string;
  /** Additional CSS classes */
  className?: string;
}

function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function StarIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

export async function GitHubStars({
  variant = "default",
  fallbackText = "Star on GitHub",
  className = "",
}: GitHubStarsProps) {
  const stars = await fetchGitHubStars();

  const repoUrl = "https://github.com/audistill/audistill";

  if (variant === "button") {
    return (
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-[10px] bg-surface hover:bg-surface-raised border border-border hover:border-accent/20 text-text text-sm font-medium transition-all duration-200 shadow-[0_0_12px_rgba(217,119,87,0.05)] hover:shadow-[0_0_16px_rgba(217,119,87,0.1)] ${className}`}
      >
        <GitHubIcon className="w-4.5 h-4.5" />
        {stars !== null ? (
          <>
            <span>Star on GitHub</span>
            <span className="flex items-center gap-1 text-secondary text-xs bg-bg/50 px-2 py-0.5 rounded-full">
              <StarIcon className="w-3 h-3 text-accent/70" />
              {formatStarCount(stars)}
            </span>
          </>
        ) : (
          <span>{fallbackText}</span>
        )}
      </a>
    );
  }

  if (variant === "compact") {
    return (
      <a
        href={repoUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`inline-flex items-center gap-1.5 text-secondary hover:text-text text-xs transition-colors duration-200 ${className}`}
      >
        <GitHubIcon className="w-3.5 h-3.5" />
        {stars !== null ? (
          <span className="flex items-center gap-1">
            <StarIcon className="w-3 h-3 text-accent/60" />
            {formatStarCount(stars)}
          </span>
        ) : (
          <span>{fallbackText}</span>
        )}
      </a>
    );
  }

  // Default variant
  return (
    <a
      href={repoUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface/60 hover:bg-surface border border-border hover:border-accent/15 text-sm text-secondary hover:text-text transition-all duration-200 ${className}`}
    >
      <GitHubIcon className="w-4 h-4" />
      {stars !== null ? (
        <span className="flex items-center gap-1">
          <StarIcon className="w-3 h-3 text-accent/70" />
          <span>{formatStarCount(stars)}</span>
        </span>
      ) : (
        <span className="text-xs">{fallbackText}</span>
      )}
    </a>
  );
}
