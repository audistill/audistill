---
title: "Wire gated actions to license modal and remove inline prompts"
status: done
created: 2026-06-15
---

## Parent

`.scratch/license-activation/issue.md`

## What to build

Replace all existing license gating feedback surfaces with calls to `openLicenseGateModal(action)`. After this, every blocked action goes through the same modal — no inline cards, no toasts.

Surfaces to rewire:
- **Chat** (`ChatSidebar.tsx`): currently catches `LicenseRequiredError` and renders `<LicenseBlockedPrompt />` inline in the message stream. Replace with `openLicenseGateModal('Sending messages')`.
- **File drop / ingest** (`App.tsx`): currently catches the error and shows a toast ("Trial ended — purchase a license to ingest new files"). Replace with `openLicenseGateModal('Ingesting new episodes')`.
- **Recipe execution**: catches the error somewhere in the recipe execution flow. Replace with `openLicenseGateModal('Running recipes')`.

Cleanup:
- Delete the `LicenseBlockedPrompt` component entirely (both the component and its `isLicenseError` helper)
- Remove the toast-based feedback for license errors in `App.tsx`
- Update imports in all affected files

The `isLicenseError` utility (string matching on error messages) should be replaced with a shared helper or kept as an internal utility if still needed for error detection — but the UI response is always the modal.

## Acceptance criteria

- [ ] Chat send failure in blocked state opens the license modal with "Sending messages"
- [ ] File drop in blocked state opens the license modal with "Ingesting new episodes"
- [ ] Recipe execution in blocked state opens the license modal with "Running recipes"
- [ ] `LicenseBlockedPrompt` component is deleted
- [ ] No toast shown for license-related errors (modal is the only feedback)
- [ ] Existing non-license error handling (network errors, etc.) remains unchanged
- [ ] Modal correctly identifies the license state (trial-expired vs license-invalid)

## Blocked by

- `.scratch/license-gate-modal/issue.md`
