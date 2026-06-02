# Issue Tracker: Local Markdown

Issues live as markdown files under `.scratch/` in this repository.

## Layout

```
.scratch/
  <feature-or-bug-slug>/
    issue.md          — the issue body (title, description, acceptance criteria)
    notes.md          — optional scratch notes, investigation logs
    status: encoded in issue.md frontmatter
```

## Creating an issue

Write a file at `.scratch/<slug>/issue.md` with this structure:

```markdown
---
title: <short title>
status: <needs-triage | needs-info | ready-for-agent | ready-for-human | wontfix | in-progress | done>
created: <YYYY-MM-DD>
---

<Body: description, acceptance criteria, context>
```

## Querying issues

- All open: find `.scratch/*/issue.md` where status is not `done` or `wontfix`
- By status: grep frontmatter `status:` field
