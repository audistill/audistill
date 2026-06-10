## Agent skills

### Issue tracker

Issues tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### E2E verification

After typecheck/tests pass, verify UI changes by running `pnpm dev:test` in the background (starts Electron with remote debugging on port 9222) and using `/agent-browser --cdp 9222` to confirm the feature works. Kill the dev server when done.
