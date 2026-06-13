---
title: "Implement blocked-action prompts in read-only mode"
status: done
created: 2026-06-13
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

When the app is in `trial-expired` or `license-invalid` state, blocked actions (ingest, summarize, chat, recipe) trigger an inline prompt instead of silently failing. The user clicks the action, and instead of the action executing, they see a clear, calm message with paths forward.

The prompt appears inline where the action result would normally appear (not a modal, not a toast). It should feel like an invitation, not a wall.

Prompt content:
- Heading: "Your trial has ended" (or "License could not be verified" for invalid state)
- Subtext: "Your library is still here — episodes, transcripts, and summaries remain viewable."
- Primary CTA: "Buy Audistill — $29" (→ Polar checkout, system browser)
- Secondary CTA: "Enter License Key" (→ navigates to Settings → License)

Surfaces where blocked prompts appear:
- Ingest: when dropping/pasting a file or URL (in place of the processing state)
- Summarization: when clicking to generate a new summary/recipe for an episode
- Chat: in the chat input area (disable send, show prompt above the input)
- Recipe: when triggering a new recipe execution

The renderer detects the `LicenseRequiredError` returned from the IPC layer and renders the prompt instead of a generic error.

## Acceptance criteria

- [ ] Blocked ingest shows inline prompt instead of starting the pipeline
- [ ] Blocked summarization shows inline prompt instead of generating
- [ ] Blocked chat shows prompt and disables message sending
- [ ] Blocked recipe shows inline prompt instead of executing
- [ ] Prompt includes both CTAs (purchase link + settings navigation)
- [ ] "Buy Audistill" opens Polar checkout in system browser
- [ ] "Enter License Key" navigates to Settings → License pane
- [ ] Prompt is styled with brand voice — calm, not hostile, acknowledges library is safe
- [ ] Prompt only appears in `trial-expired` and `license-invalid` states (not during active trial or licensed)
- [ ] If the user activates a license (from Settings), prompts disappear reactively

## Blocked by

- `.scratch/license-gate-services/` — needs `LicenseRequiredError` to be thrown by services
- `.scratch/license-ipc-layer/` — needs the error type forwarded to renderer
