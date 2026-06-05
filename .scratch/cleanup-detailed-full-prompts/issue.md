---
title: Clean up detailed.txt and full.txt prompts
status: done
created: 2026-06-05
---

## What to build

Clean up the detailed and full summary prompts to remove noise while preserving their dynamic section heading freedom. Both prompts get the same treatment:

- Drop the content-type examples block (the "For meetings... / For podcasts... / For lectures..." section)
- Drop the "10-20% of transcript length" percentage guidance
- Keep dynamic section headings — the model decides heading names based on content
- Keep word ranges (500-1500 for detailed, 2000-5000 for full)
- Keep JSON format instruction (`title` + `summary` fields)
- Keep language matching rule and "be specific" rule
- No skeleton example needed for these views

## Acceptance criteria

- [ ] `detailed.txt` has no content-type examples block
- [ ] `detailed.txt` has no percentage-of-transcript guidance
- [ ] `detailed.txt` retains: dynamic headings, 500-1500 word range, JSON format, language matching, "be specific"
- [ ] `full.txt` has no content-type examples block
- [ ] `full.txt` has no percentage-of-transcript guidance
- [ ] `full.txt` retains: dynamic headings, 2000-5000 word range, JSON format, language matching, "be specific"

## Blocked by

- `.scratch/summarization-system-user-split` — the prompts are now used as system messages
