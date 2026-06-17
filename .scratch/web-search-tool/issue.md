---
title: Add web_search tool to Chat (DuckDuckGo HTML, no API key)
status: done
created: 2026-06-17
---

## What to build

Add a `web_search` tool to the Chat agent so it can look up external information — people, companies, events, or topics mentioned in an Episode's Transcript — without requiring any additional API key from the user.

The search backend is DuckDuckGo's HTML endpoint (`https://html.duckduckgo.com/html/`). This is a stable, intentionally minimal page DDG maintains for accessibility/low-bandwidth users. It requires no authentication and returns results as plain HTML that can be parsed with simple string/DOM operations.

### How it works

1. **Main process service** — A new `web-search-service.ts` in `src/main/` exports a function:

   ```ts
   searchDDG(query: string, maxResults?: number): Promise<{ title: string; url: string; snippet: string }[]>
   ```

   Implementation: POST to `https://html.duckduckgo.com/html/` with form body `q=<query>`, parse the returned HTML for result blocks (each result has a title link, URL, and snippet text). Use Electron's `net.fetch` for the HTTP call (consistent with ChatService). No external dependencies needed — parse with regex or a lightweight approach since the HTML structure is minimal and stable.

2. **Tool executor** — Add a `web_search` case to `ChatToolExecutor.executeTool()` that calls `searchDDG()` and returns the results as JSON.

3. **Tool definition** — Add the tool schema to the `TOOL_DEFINITIONS` array in `ChatSidebar.tsx`:

   ```ts
   {
     name: 'web_search',
     description: 'Search the web for information about people, companies, events, or topics mentioned in the episode. Use this when the user asks about something not covered in the transcript.',
     parameters: {
       type: 'object',
       properties: {
         query: { type: 'string', description: 'Search query' },
         max_results: { type: 'number', description: 'Maximum number of results to return (default: 10)' },
       },
       required: ['query'],
     },
   }
   ```

### Design decisions

- **Snippets only** — returns title + URL + snippet per result. No full page content extraction. This covers the 80% use case (quick enrichment) without complexity.
- **No configuration** — zero UI, zero settings. Works immediately with the user's existing OpenRouter key (which powers the LLM that calls the tool).
- **Default 10 results** — the LLM can optionally request fewer via `max_results`.
- **Main process only** — the HTTP call uses `net.fetch` in the main process, same pattern as OpenRouter calls in `chat-service.ts`.

## Acceptance criteria

- [ ] New file `src/main/web-search-service.ts` with `searchDDG(query, maxResults?)` function
- [ ] POST to `https://html.duckduckgo.com/html/` with form-encoded query, parse HTML response into `{ title, url, snippet }[]`
- [ ] `ChatToolExecutor` handles `web_search` tool name, calls `searchDDG`, returns JSON results
- [ ] `TOOL_DEFINITIONS` in `ChatSidebar.tsx` includes `web_search` with `query` (required) and `max_results` (optional, default 10) parameters
- [ ] Works without any API key beyond the existing OpenRouter key
- [ ] Handles errors gracefully (network failure, DDG rate-limiting) — returns a JSON error object, does not crash
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes (add a unit test for the HTML parsing logic with a fixture of DDG HTML)

## Blocked by

None — can start immediately.
