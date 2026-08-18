# Contributing to Audistill

Thanks for taking an interest. Before you spend time on a change, please read the note about how this repository works — it affects how contributions get merged.

## How this repository works

Day-to-day development happens in a **private repository**. This public repository is a **source snapshot**: it receives one squashed commit per release, and GitHub Releases here provide the signed builds, the auto-update feed, and the Homebrew cask source.

Two consequences:

- **`main` is rewritten on every release.** Local branches tracking it will diverge after each snapshot; re-clone or hard-reset rather than merging.
- **Pull requests cannot be merged directly.** A merge commit here would be overwritten by the next snapshot.

PRs are still worth opening — see below.

## Filing issues

Issues are the most useful thing you can contribute, and they're read here on the public repo.

A good bug report has:

- macOS version and Mac model (Apple Silicon generation)
- Audistill version (Settings → About)
- What you did, what you expected, what happened
- Reproduction steps, if you can find them
- Relevant log output, with anything private redacted

Please don't paste API keys, license keys, or transcript content you'd rather not publish.

## Pull requests

Open them anyway — they're welcome, they just take a different path:

1. Open the PR against `main` as usual, describing the change and why.
2. If the change is accepted, it gets ported into the private tree by hand and ships in the next release snapshot.
3. You're credited in the release notes for the version it ships in.
4. The PR is then closed with a pointer to that release. A closed PR here means "shipped," not "rejected" — the close comment will say which.

Because of that porting step, **small, focused PRs are much more likely to land** than large refactors. For anything substantial, please open an issue first so we can agree on the approach before you write it.

By contributing, you agree that your contribution is licensed under [AGPL-3.0](LICENSE), the same license as the project.

## Building from source

```bash
git clone https://github.com/audistill/audistill.git
cd audistill
pnpm install
pnpm dev
```

Requirements: macOS 13+, Node 20+, pnpm. Self-builds have all features unlocked — no license key or trial. See the [README](README.md#build-from-source) for details.

Before opening a PR:

```bash
pnpm typecheck
pnpm test
```

## Expectations

Audistill is a spare-time hobby project maintained by one person. Responses are best-effort, and review may take a while. That's not disinterest — it's a small time budget.
