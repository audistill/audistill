# Release-note and Help content guidance

Audistill bundles Help and Release Notes from local Markdown under `content/`. User-visible product work is not done until the bundled content that users rely on is current.

## When to add an unreleased fragment

Add or update a fragment under `content/releases/unreleased/` for changes that a user can notice or benefit from, including:

- new user-facing features or workflows
- changed behavior in the app UI, import flow, export flow, licensing, updates, Settings, Chat, Recipes, Tabs, or Ingest
- visible performance or reliability improvements
- user-facing bug fixes, especially when they unblock a workflow or remove a confusing error

Internal-only changes do **not** need a fragment when they do not change user-visible behavior. Examples: refactors with no behavior change, test-only changes, build tooling that does not affect release users, renaming internal functions, or changing implementation details behind the same UI and behavior.

## Fragment schema

Each fragment is a Markdown file with frontmatter and body text:

```md
---
type: added | improved | fixed
title: Short user-facing title
---

One or two concise paragraphs in user language. Explain the outcome, not the implementation.
```

Allowed `type` values:

- `added` — a new capability or workflow
- `improved` — a visible enhancement to existing behavior
- `fixed` — a user-facing defect correction

The body must be non-empty Markdown. Write for users, not commit history.

## Good fragments

```md
---
type: added
title: Import audio from RSS feeds
---

Paste a feed URL to choose episodes from the feed and ingest them into your Library with Source provenance preserved.
```

```md
---
type: improved
title: Clearer Transcription Model setup
---

The setup screen now shows Transcription Model download progress and explains when Ingest is disabled until the model is ready.
```

```md
---
type: fixed
title: Search ignores hidden Starred duplicates
---

Sidebar search no longer shows duplicate Starred results when an Episode also matches in its Folder or the Inbox.
```

## Internal-only examples that do not need fragments

- Extracting a React component without changing the UI.
- Adding unit tests around existing behavior.
- Renaming a private helper or moving code between modules.
- Updating developer documentation only.
- Changing release scripts in a way users do not see in the shipped app.

## Help content updates

Update files under `content/help/` when behavior users rely on changes, especially for:

- onboarding or setup steps
- Ingest, Source support, Transcription, and Transcription Model behavior
- Recipes, Tabs, Chat, Models, and custom instructions
- Licensing, Trial, Activation, or gated actions
- troubleshooting guidance and recovery steps

Use Audistill domain language from `CONTEXT.md`: Episode, Transcript, Tab, Recipe, Source, Ingest, Chat, Model, Transcription Model, License, Trial, and Activation.
