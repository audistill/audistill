# Public release workflow

Audistill uses a private development repository and a public source snapshot repository:

- **Private dev repo:** `audistill/audistill-dev`
- **Public snapshot/release repo:** `audistill/audistill`
- **Homebrew tap:** `audistill/homebrew-tap`

The public repo receives one squashed source commit per release. GitHub Releases on the public repo provide the Electron auto-update assets, the website download target, and the Homebrew cask URL.

## One-command release

From the private checkout:

```bash
cd ~/git/audistill_app

AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --bump patch
```

Use `minor` or `major` instead of `patch` when appropriate:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --bump minor
```

The command runs:

1. verifies the private checkout is clean and not pointed at the public repo
2. verifies the bot token can push to `audistill/audistill` and `audistill/homebrew-tap`
3. bumps `package.json`
4. compiles bundled Release Notes from `content/releases/unreleased/`
5. commits the private release commit as `v{version}`
6. builds, signs, notarizes, and verifies the macOS app
7. pushes the private release commit to `audistill/audistill-dev`
8. exports private `HEAD` to `~/git/audistill_public`
9. creates a squashed public snapshot commit and tag
10. creates the GitHub Release with DMG, ZIP, and `latest-mac.yml`
11. updates the Homebrew cask with an `audistill-bot` authored commit
12. verifies `https://audistill.com/download`

## Prerequisites

### Local Apple signing/notarization

The release build still happens locally on the Mac. Required environment variables:

| Variable | Purpose |
| --- | --- |
| `CSC_NAME` | Developer ID Application signing identity |
| `APPLE_API_KEY_ID` | App Store Connect API key ID |
| `APPLE_API_ISSUER` | App Store Connect API issuer UUID |
| `APPLE_API_KEY` | Path to the `.p8` private key |

### Public publishing token

`AUDISTILL_PUBLIC_GH_TOKEN` must be a token for the public publishing bot, currently `audistill-bot`.

For a fine-grained PAT:

- Resource owner: `audistill`
- Repository access:
  - `audistill/audistill`
  - `audistill/homebrew-tap`
- Repository permissions:
  - **Contents: Read and write**
  - **Metadata: Read**

If the org requires approval for fine-grained PATs, approve the token in:

```text
https://github.com/organizations/audistill/settings/personal-access-token-requests
```

## Before releasing

1. Confirm the private checkout is clean:

   ```bash
   git status
   ```

2. Add release-note fragments for user-visible changes under:

   ```text
   content/releases/unreleased/
   ```

3. Ensure the bot token is available only in the shell environment. Do not commit it or paste it into logs.

## Release without bumping

Use this when `package.json` already has the intended version:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --no-bump
```

## Retry after a partial publish failure

If the build completed and `dist/` still contains the correct artifacts, rerun without rebuilding:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm release:public -- --no-bump --skip-build --recreate
```

`--recreate` replaces the public tag and GitHub Release for the current version. Use it only for the same version.

If the failure happened before artifacts were created, fix the issue and rerun with `--no-bump` if the release commit already exists.

## Low-level commands

Usually prefer `pnpm release:public`. Use these only for debugging or recovery.

Build/sign/notarize locally without publishing:

```bash
pnpm release:mac
```

Publish an already-built private `HEAD` snapshot:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm snapshot:public -- --init --push --publish-release --update-brew
```

The snapshot replaces the private checkout's `.gitignore` with
`scripts/public-repo.gitignore`, clears the public Git index, and stages the
export again. This keeps private issue, agent, and prototype files out even if
they were tracked by an earlier public snapshot.

To replace leaked public history with one clean snapshot commit and keep only
the current release tag:

```bash
AUDISTILL_PUBLIC_GH_TOKEN="$AUDISTILL_BOT_TOKEN" \
  pnpm snapshot:public -- --init --reset-history --recreate --push --publish-release
```

`--reset-history` force-updates `main`, force-updates the current version tag,
and deletes older tags. Use it only for deliberate public-history cleanup.

## Verification

The release script performs these checks automatically, but they are useful for manual verification:

```bash
VERSION=$(node -p "require('./package.json').version")

gh release view "v$VERSION" \
  --repo audistill/audistill \
  --json tagName,author,assets \
  --jq '{tag:.tagName, author:.author.login, assets:[.assets[].name]}'

curl -I -L https://github.com/audistill/audistill/releases/latest
curl -I -L https://audistill.com/download

cd ~/git/audistill_public
git log --format='%h %an <%ae> %ad %s' --date=short --max-count=5
```

Expected public assets:

```text
Audistill-{version}-arm64.dmg
Audistill-{version}-arm64-mac.zip
latest-mac.yml
```

Expected public commit author:

```text
Audistill Maintainers <dev@audistill.com>
```

## Do not use

Do not use the old private-repo publishing path after the split. The local build script now rejects this mode:

```bash
pnpm release:mac --publish
```

Use `pnpm release:public` instead.

## Token cleanup

After publishing, remove the token from the current shell if it is no longer needed:

```bash
unset AUDISTILL_PUBLIC_GH_TOKEN
```
