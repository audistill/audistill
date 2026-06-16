const REPO = "audistill/audistill";
const REVALIDATE_SECONDS = 3600; // 1 hour

/**
 * Fetches the star count for the Audistill GitHub repo.
 * Returns `null` on any error (404, rate limit, private repo, network error).
 * Uses Next.js ISR caching with ~1 hour revalidation.
 */
export async function fetchGitHubStars(): Promise<number | null> {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}`, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: {
        Accept: "application/vnd.github.v3+json",
        // No auth token — uses unauthenticated rate limit (60 req/hour)
      },
    });

    if (!res.ok) {
      return null;
    }

    const data = await res.json();

    if (typeof data.stargazers_count !== "number") {
      return null;
    }

    return data.stargazers_count;
  } catch {
    return null;
  }
}

/**
 * Formats a star count for display (e.g., 1234 → "1.2k")
 */
export function formatStarCount(count: number): string {
  if (count >= 1000) {
    const formatted = (count / 1000).toFixed(1);
    // Remove trailing .0
    const clean = formatted.endsWith(".0")
      ? formatted.slice(0, -2)
      : formatted;
    return `${clean}k`;
  }
  return count.toString();
}
