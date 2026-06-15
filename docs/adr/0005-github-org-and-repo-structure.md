# GitHub organization with public landing page repo for releases

Use a dedicated GitHub organization (`audistill`) with two repositories: a private repo for the application codebase and a public repo for the landing page that also hosts GitHub Releases for auto-update distribution.

The key constraint: electron-updater needs to fetch `latest-mac.yml` from a publicly accessible URL. Hosting releases on the public repo avoids embedding GitHub tokens in the app binary or setting up separate infrastructure (S3, CDN). The landing page repo naturally doubles as the release distribution point — one public surface for both marketing and updates.

## Considered Options

- **Personal GitHub account, single private repo** — simplest, but mixes personal and product identity, requires a token or separate hosting for update feed, no path to collaborators without exposing personal repos.
- **Organization with single public repo** — exposes source code. Premature for a commercial product.
- **Organization with private repo + separate S3/CDN for releases** — works but adds infrastructure cost and complexity for a solo operation.
- **Organization: private `app` repo + public `audistill.com` repo** — chosen. Clean separation, professional brand presence, free GitHub Pages hosting, and the public repo provides a token-free endpoint for electron-updater's release feed.
