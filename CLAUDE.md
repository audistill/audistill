## Project structure

- Root: Electron desktop app (React + TypeScript)
- `landing/`: Separate Next.js project for the marketing/landing page (has its own `package.json`, `node_modules`, etc.)

## Agent skills

### Issue tracker

Issues tracked as local markdown files under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout — one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### E2E verification

After typecheck/tests pass, verify UI changes by running `pnpm dev:test` in the background (starts Electron with remote debugging on port 9222) and using `/agent-browser --cdp 9222` to confirm the feature works. Kill the dev server when done.

## Development workflow

### Issue pickup

1. Read all issues in `.scratch/*/issue.md`
2. Find the highest-priority issue with status `ready-for-agent` whose blockers (if any) are all `done`
3. Work only on that one issue
4. Update status to `in-progress` before starting work
5. Update status to `done` when finished

### Testing

After implementation, run typecheck and tests — fix any failures before considering the work done:

```bash
pnpm typecheck
pnpm test
```

### Git

Make a single commit per issue with a descriptive message. Do not make intermediate commits.
