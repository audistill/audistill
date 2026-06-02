#!/usr/bin/env bash
set -e

claude --permission-mode acceptEdits "\
@.scratch/ @CLAUDE.md \

1. Read all issues in .scratch/*/issue.md. Find the highest-priority issue with status 'ready-for-agent' whose blockers (if any) are all 'done'. Work only on that one issue. \

2. Update the issue status to 'in-progress' before starting work. \

3. Implement the issue end-to-end, satisfying all acceptance criteria. \

4. If pnpm scripts exist for typecheck or test, run them and fix any failures. \

5. Update the issue status to 'done'. \

6. Make a single git commit with a descriptive message. \

ONLY WORK ON A SINGLE ISSUE. \
If all ready-for-agent issues are blocked or done, output <promise>COMPLETE</promise>. \
"
