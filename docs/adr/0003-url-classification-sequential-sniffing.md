# URL classification via sequential sniffing — no user-declared type

When a user pastes a URL, the app auto-detects whether it's a YouTube link, an RSS/Atom feed, or a direct audio/video file. The user never selects a "type" from a dropdown or chooses between separate import flows.

Detection order:
1. YouTube regex (instant, local, no network)
2. HTTP HEAD request (follows redirects, inspects final Content-Type)
3. Route by Content-Type: RSS/Atom XML → feed parser; audio/video MIME → direct download; anything else → reject with clear error

The trade-off: we cannot support URLs that are HTML pages wrapping audio (SoundCloud, Spotify, blog posts with embedded players). A HEAD request to those returns `text/html`, which we reject. Supporting them would require page scraping or per-platform extractors — a complexity cliff we avoid by drawing a clear boundary: YouTube (via yt-dlp), feeds (via RSS parser), and direct file links (via HTTP download). Everything else is explicitly unsupported with a user-facing message explaining what's accepted.

We also accept that some feeds are misconfigured and serve RSS with `text/html` Content-Type. We handle `text/xml` and `application/xml` generously (attempt RSS parse, fail gracefully if it's not a feed), but we do not sniff response bodies when Content-Type says `text/html` — that path leads to heuristic fragility.

## Considered Options

- **User declares type** (dropdown: YouTube / Feed / File link) — eliminates ambiguity but adds friction and forces the user to know what kind of URL they have. Rejected because the detection is reliable enough for the three supported types.
- **Body sniffing for all URLs** (fetch body, look for XML prolog or binary audio headers) — handles misconfigured servers but makes every import slower (full GET instead of HEAD) and opens the door to false positives. Rejected in favor of trusting Content-Type.
- **Sequential Content-Type sniffing** — chosen. Fast (one HEAD request), unambiguous for the supported types, clear rejection for everything else.
