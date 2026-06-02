# Triage Labels

Mapping from canonical triage roles to the strings used in this repo's issue tracker.

| Role | String |
|------|--------|
| Maintainer needs to evaluate | `needs-triage` |
| Waiting on reporter | `needs-info` |
| Fully specified, AFK-agent-ready | `ready-for-agent` |
| Needs human implementation | `ready-for-human` |
| Will not be actioned | `wontfix` |

These are encoded in the `status` frontmatter field of `.scratch/*/issue.md` files.
