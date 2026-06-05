---
title: Rewrite brief.txt prompt with fixed three-section structure
status: done
created: 2026-06-05
---

## What to build

Rewrite the brief summary prompt (`brief.txt`) to enforce a consistent three-section output structure with fixed heading names, a skeleton example, and simplified constraints.

The three fixed sections are:
1. **Rundown** — 1-2 sentence overview of what this is about
2. **Key details** — 3-6 specific bullets with names, numbers, concrete details
3. **Why it matters** — 1 sentence on significance or takeaway

Key changes:
- Fix the three section headings (always "Rundown", "Key details", "Why it matters") — instruct the model to translate them into the transcript's language
- Include a skeleton example showing the exact markdown shape (`## Heading`, `- bullet` style)
- Word range: 150-600 words
- Drop the content-type detection block entirely (no more "For meetings... / For podcasts..." examples)
- Drop the "10-20% of transcript length" guidance
- Keep: language matching rule, "be specific" rule, JSON format instruction (`title` + `summary` fields)

## Acceptance criteria

- [ ] `brief.txt` specifies exactly three sections: Rundown, Key details, Why it matters
- [ ] Prompt instructs the model to translate headings into the transcript language
- [ ] A skeleton example is included showing the exact expected markdown structure
- [ ] Word range is 150-600
- [ ] No content-type detection block or percentage guidance remains
- [ ] JSON format instruction for `title` and `summary` fields is present
- [ ] Language matching and "be specific" rules are preserved

## Blocked by

- `.scratch/summarization-system-user-split` — the prompt is now used as a system message
