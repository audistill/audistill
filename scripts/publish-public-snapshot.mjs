#!/usr/bin/env node

/**
 * Publish the private working tree as a public source snapshot.
 *
 * This keeps real development history in the private repo while publishing a
 * clean, squashed public repo commit/tag and optional GitHub Release assets.
 *
 * Typical flow:
 *   pnpm release:mac
 *   AUDISTILL_PUBLIC_GH_TOKEN=... pnpm snapshot:public -- --push --publish-release --update-brew
 */

import { spawnSync } from 'child_process'
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'fs'
import { homedir, tmpdir } from 'os'
import { dirname, resolve, sep } from 'path'
import { readVersionedReleaseNoteBody } from './content-system.mjs'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)

const DEFAULT_PUBLIC_REPO = 'audistill/audistill'
const DEFAULT_PUBLIC_DIR = resolve(root, '..', 'audistill_public')
const DEFAULT_TAP_REPO = 'audistill/homebrew-tap'
const DEFAULT_AUTHOR_NAME = 'Audistill Maintainers'
const DEFAULT_AUTHOR_EMAIL = 'dev@audistill.com'
const DEFAULT_TAP_AUTHOR_NAME = 'audistill-bot'
const DEFAULT_TAP_AUTHOR_EMAIL = '302077012+audistill-bot@users.noreply.github.com'

function hasFlag(name) {
  return args.includes(name)
}

function argValue(name, fallback = null) {
  const index = args.indexOf(name)
  if (index === -1) return fallback
  const value = args[index + 1]
  if (!value || value.startsWith('--')) fail(`${name} requires a value`)
  return value
}

function expandPath(path) {
  if (!path) return path
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return resolve(homedir(), path.slice(2))
  return resolve(path)
}

function usage() {
  console.log(`Publish a public Audistill source snapshot.

Usage:
  node scripts/publish-public-snapshot.mjs [options]

Options:
  --public-repo <owner/repo>     Public GitHub repo (default: ${DEFAULT_PUBLIC_REPO})
  --public-dir <path>           Local checkout for public repo (default: ${DEFAULT_PUBLIC_DIR})
  --tap-repo <owner/repo>       Homebrew tap repo (default: ${DEFAULT_TAP_REPO})
  --init                        Clone/init the public checkout if missing
  --push                        Push public snapshot commit and tag
  --publish-release             Create the public GitHub Release from dist artifacts
  --update-brew                 Update and push the Homebrew tap cask
  --recreate                    Recreate local tag and GitHub Release when they already exist
  --reset-history               Replace public history with one clean snapshot commit
  --allow-dirty                 Export HEAD even if private checkout has uncommitted files
  --force                       Allow replacing a dirty public checkout
  --dry-run                     Print actions without changing public repo/release/tap
  --author-name <name>          Snapshot git author name (default: ${DEFAULT_AUTHOR_NAME})
  --author-email <email>        Snapshot git author email (default: ${DEFAULT_AUTHOR_EMAIL})
  --tap-author-name <name>      Homebrew tap git author name (default: ${DEFAULT_TAP_AUTHOR_NAME})
  --tap-author-email <email>    Homebrew tap git author email (default: ${DEFAULT_TAP_AUTHOR_EMAIL})
  --commit-message <message>    Snapshot commit message (default: Snapshot v<version>)
  --tag <tag>                   Release tag (default: v<package.json version>)
  --help                        Show this help

Environment:
  AUDISTILL_PUBLIC_GH_TOKEN     Optional bot/machine-user token for git push and gh release
  GH_TOKEN                      Used by gh if AUDISTILL_PUBLIC_GH_TOKEN is unset

Recommended:
  1. Run pnpm release:mac in the private checkout to build/sign/notarize.
  2. Run this script with --push --publish-release --update-brew.
  3. Use AUDISTILL_PUBLIC_GH_TOKEN if you do not want public push/release events under your personal account.
`)
}

if (hasFlag('--help')) {
  usage()
  process.exit(0)
}

const dryRun = hasFlag('--dry-run')
const init = hasFlag('--init')
const push = hasFlag('--push')
const publishRelease = hasFlag('--publish-release')
const updateBrew = hasFlag('--update-brew')
const recreate = hasFlag('--recreate')
const resetHistory = hasFlag('--reset-history')
const allowDirty = hasFlag('--allow-dirty')
const force = hasFlag('--force')

const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
const publicRepo = argValue('--public-repo', DEFAULT_PUBLIC_REPO)
const publicDir = expandPath(argValue('--public-dir', process.env.AUDISTILL_PUBLIC_DIR || DEFAULT_PUBLIC_DIR))
const tapRepo = argValue('--tap-repo', DEFAULT_TAP_REPO)
const authorName = argValue('--author-name', DEFAULT_AUTHOR_NAME)
const authorEmail = argValue('--author-email', DEFAULT_AUTHOR_EMAIL)
const tapAuthorName = argValue('--tap-author-name', DEFAULT_TAP_AUTHOR_NAME)
const tapAuthorEmail = argValue('--tap-author-email', DEFAULT_TAP_AUTHOR_EMAIL)
const tag = argValue('--tag', `v${version}`)
const commitMessage = argValue('--commit-message', `Snapshot ${tag}`)
const publicToken = process.env.AUDISTILL_PUBLIC_GH_TOKEN || ''
const legacyTags = []

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function commandLabel(command, commandArgs) {
  const label = [command, ...commandArgs]
    .map((part) => (part.includes(' ') ? JSON.stringify(part) : part))
    .join(' ')
  return publicToken ? label.replaceAll(publicToken, '<redacted-token>') : label
}

function run(command, commandArgs, options = {}) {
  const cwd = options.cwd || root
  const env = options.env || process.env
  const label = commandLabel(command, commandArgs)
  console.log(`\n▸ ${label}`)

  if (dryRun && !options.alwaysRun) {
    return ''
  }

  const result = spawnSync(command, commandArgs, {
    cwd,
    env,
    input: options.input,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: options.maxBuffer ?? 512 * 1024 * 1024,
    stdio: options.capture ? ['pipe', 'pipe', 'pipe'] : ['inherit', 'inherit', 'inherit'],
  })

  if (result.status !== 0) {
    if (options.allowFailure) {
      return options.capture ? (result.stdout || '').trim() : ''
    }
    if (options.capture && result.stderr) process.stderr.write(result.stderr)
    fail(`Command failed: ${label}`)
  }

  return options.capture ? (result.stdout || '').trim() : ''
}

function capture(command, commandArgs, options = {}) {
  return run(command, commandArgs, { ...options, capture: true, alwaysRun: true })
}

function git(cwd, gitArgs, options = {}) {
  return run('git', gitArgs, { cwd, ...options })
}

function gitCapture(cwd, gitArgs, options = {}) {
  return capture('git', gitArgs, { cwd, ...options })
}

function publicRepoUrl(repo) {
  return `https://github.com/${repo}.git`
}

function authenticatedGitArgs(gitArgs) {
  if (!publicToken) return gitArgs
  return [
    '-c',
    'credential.helper=',
    '-c',
    'credential.helper=!f() { echo username=x-access-token; echo password="$AUDISTILL_PUBLIC_GH_TOKEN"; }; f',
    ...gitArgs,
  ]
}

function publicPushArgs(...refs) {
  if (!publicToken) return ['push', '-u', 'origin', ...refs]
  return authenticatedGitArgs(['push', publicRepoUrl(publicRepo), ...refs])
}

function safeToClearPublicDir() {
  if (publicDir === root) return false
  if (root.startsWith(`${publicDir}${sep}`)) return false
  if (publicDir === homedir()) return false
  if (publicDir === '/') return false
  return true
}

function ensurePrivateCheckoutReady() {
  const gitRoot = gitCapture(root, ['rev-parse', '--show-toplevel'])
  if (resolve(gitRoot) !== root) fail(`Expected repo root ${root}, got ${gitRoot}`)

  const status = gitCapture(root, ['status', '--porcelain'])
  if (status && !allowDirty) {
    fail('Private checkout has uncommitted changes. Commit them or pass --allow-dirty to snapshot HEAD only.')
  }
}

function ensurePublicCheckout() {
  if (!safeToClearPublicDir()) {
    fail(`Refusing to use dangerous public directory: ${publicDir}`)
  }

  if (!existsSync(publicDir)) {
    if (!init) {
      fail(`Public checkout does not exist: ${publicDir}. Clone it first or pass --init.`)
    }
    if (dryRun) {
      console.log(`\n  ℹ Would clone public checkout to ${publicDir}`)
      return
    }
    mkdirSync(dirname(publicDir), { recursive: true })
    run('git', ['clone', `git@github.com:${publicRepo}.git`, publicDir], { cwd: dirname(publicDir) })
  }

  if (!existsSync(resolve(publicDir, '.git'))) {
    if (!init) fail(`${publicDir} is not a git checkout`)
    git(publicDir, ['init'])
    git(publicDir, ['branch', '-M', 'main'])
  }

  git(publicDir, ['branch', '-M', 'main'])

  const origin = gitCapture(publicDir, ['remote', 'get-url', 'origin'], { allowFailure: true })
  if (!origin) {
    git(publicDir, ['remote', 'add', 'origin', `git@github.com:${publicRepo}.git`])
  } else if (!origin.includes(publicRepo) && !force) {
    fail(`Public checkout origin is ${origin}, expected ${publicRepo}. Pass --force if this is intentional.`)
  }

  git(publicDir, ['config', 'user.name', authorName])
  git(publicDir, ['config', 'user.email', authorEmail])

  const status = gitCapture(publicDir, ['status', '--porcelain'])
  if (status && !force) {
    fail(`Public checkout has uncommitted changes at ${publicDir}. Commit/clean it or pass --force to replace it.`)
  }
}

function clearPublicCheckout() {
  console.log(`\n▸ Clear public checkout: ${publicDir}`)
  if (dryRun) return

  for (const entry of readdirSync(publicDir)) {
    if (entry === '.git') continue
    rmSync(resolve(publicDir, entry), { recursive: true, force: true })
  }
}

function exportHeadToPublicCheckout() {
  console.log(`\n▸ Export private HEAD to ${publicDir}`)
  if (dryRun) return

  const archive = spawnSync('git', ['-C', root, 'archive', '--format=tar', 'HEAD'], {
    encoding: null,
    maxBuffer: 512 * 1024 * 1024,
  })
  if (archive.status !== 0) fail('Failed to create git archive from private HEAD')

  const extract = spawnSync('tar', ['-x', '-C', publicDir], {
    input: archive.stdout,
    stdio: ['pipe', 'inherit', 'inherit'],
  })
  if (extract.status !== 0) fail('Failed to extract snapshot into public checkout')

  copyFileSync(resolve(root, 'scripts/public-repo.gitignore'), resolve(publicDir, '.gitignore'))
}

const FORBIDDEN_PUBLIC_PATHS = [
  /^\.scratch(?:\/|$)/,
  /^\.agents(?:\/|$)/,
  /^\.pi(?:\/|$)/,
  /^\.claude(?:\/|$)/,
  /^\.superpowers(?:\/|$)/,
  /^(?:AGENTS|CLAUDE|CONTEXT)\.md$/,
  /^tickets\.md$/,
  /^prototype-content-header(?:\/|$)/,
  /^prototypes(?:\/|$)/,
  /(?:^|\/)public-repo\.gitignore$/,
  /\.tsbuildinfo$/,
]

function stageAndVerifySnapshot() {
  if (dryRun) return

  // Start from an empty index so the dedicated .gitignore also applies to
  // paths tracked by an older public snapshot.
  git(publicDir, ['read-tree', '--empty'])
  git(publicDir, ['add', '-A'])

  const stagedPaths = gitCapture(publicDir, ['ls-files']).split('\n').filter(Boolean)
  const forbiddenPaths = stagedPaths.filter((path) =>
    FORBIDDEN_PUBLIC_PATHS.some((pattern) => pattern.test(path)))

  if (forbiddenPaths.length > 0) {
    fail(`Private files are staged for the public snapshot:\n${forbiddenPaths.map((path) => `  - ${path}`).join('\n')}`)
  }

  console.log(`  ✔ Public snapshot filter verified (${stagedPaths.length} files)`)
}

function tagExists() {
  const result = spawnSync('git', ['rev-parse', '--verify', `refs/tags/${tag}`], {
    cwd: publicDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })
  return result.status === 0
}

function tagPointsAtHead() {
  const tagSha = gitCapture(publicDir, ['rev-list', '-n', '1', tag], { allowFailure: true })
  const headSha = gitCapture(publicDir, ['rev-parse', 'HEAD'])
  return tagSha === headSha
}

function commitAndTagSnapshot() {
  if (dryRun) {
    console.log(`\n▸ Would commit snapshot and create tag ${tag}`)
    return
  }

  if (resetHistory) {
    const tree = gitCapture(publicDir, ['write-tree'])
    const commit = gitCapture(publicDir, ['commit-tree', tree, '-m', commitMessage])
    git(publicDir, ['reset', '--hard', commit])
    git(publicDir, ['branch', '-M', 'main'])

    legacyTags.push(...gitCapture(publicDir, ['tag', '--list'])
      .split('\n')
      .filter((existingTag) => existingTag && existingTag !== tag))
    for (const legacyTag of legacyTags) git(publicDir, ['tag', '-d', legacyTag])

    console.log('  ✔ Replaced public history with a clean root commit')
  } else {
    const status = gitCapture(publicDir, ['status', '--porcelain'])
    if (status) {
      git(publicDir, ['commit', '-m', commitMessage])
    } else {
      console.log('\n  ✔ Public checkout already matches private HEAD snapshot')
    }
  }

  if (tagExists()) {
    if (tagPointsAtHead()) {
      console.log(`  ✔ Tag ${tag} already points at public snapshot HEAD`)
      return
    }
    if (!recreate && !resetHistory) {
      fail(`Tag ${tag} already exists but does not point at public HEAD. Pass --recreate to replace it.`)
    }
    git(publicDir, ['tag', '-d', tag])
  }

  git(publicDir, ['tag', tag])
}

function pushSnapshot() {
  if (!push) {
    console.log('\n  ℹ Snapshot prepared locally only. Pass --push to publish main and tag.')
    return
  }

  if (!publicToken) {
    console.log('\n  ⚠ No AUDISTILL_PUBLIC_GH_TOKEN set; git push will use the checkout remote credentials.')
  }

  const mainRef = resetHistory ? '+main:main' : 'main'
  git(publicDir, publicPushArgs(mainRef))

  if (resetHistory && legacyTags.length > 0) {
    const deleteArgs = publicToken
      ? authenticatedGitArgs(['push', publicRepoUrl(publicRepo), '--delete', ...legacyTags])
      : ['push', 'origin', '--delete', ...legacyTags]
    git(publicDir, deleteArgs)
  }

  const forceTag = recreate || resetHistory
  const tagPush = publicToken
    ? authenticatedGitArgs(['push', forceTag ? '--force' : undefined, publicRepoUrl(publicRepo), `refs/tags/${tag}`].filter(Boolean))
    : ['push', forceTag ? '--force' : undefined, 'origin', `refs/tags/${tag}`].filter(Boolean)
  git(publicDir, tagPush)
}

function releaseAssetPaths() {
  return {
    dmg: resolve(root, `dist/Audistill-${version}-arm64.dmg`),
    zip: resolve(root, `dist/Audistill-${version}-arm64-mac.zip`),
    latestYml: resolve(root, 'dist/latest-mac.yml'),
  }
}

function assertReleaseAssets() {
  const assets = releaseAssetPaths()
  for (const [name, path] of Object.entries(assets)) {
    if (!existsSync(path)) fail(`Missing ${name} artifact: ${path}. Run pnpm release:mac first.`)
  }
  return assets
}

function releaseNotes() {
  const releaseNoteBody = readVersionedReleaseNoteBody(root, version)
  return `${releaseNoteBody}

---

## Download

- **[Audistill-${version}-arm64.dmg](https://github.com/${publicRepo}/releases/download/${tag}/Audistill-${version}-arm64.dmg)** — drag to Applications
- Or install via Homebrew: \`brew tap audistill/tap && brew install --cask audistill\`

## Install via Homebrew

\`\`\`bash
brew tap audistill/tap
brew install --cask audistill
\`\`\`

## System requirements

- macOS 13+ (Ventura or later)
- Apple Silicon (M1/M2/M3/M4)

Signed and notarized with Developer ID.`
}

function ghEnv() {
  if (!publicToken) return process.env
  return { ...process.env, GH_TOKEN: publicToken }
}

function publishGitHubRelease() {
  if (!publishRelease) return
  if (!push) fail('--publish-release requires --push so the public tag exists on GitHub')

  const assets = assertReleaseAssets()
  const notesFile = resolve(root, 'dist/.release-notes-public.md')

  if (dryRun) {
    console.log(`\n▸ Would create GitHub Release ${tag} in ${publicRepo}`)
    console.log(`  Assets: ${assets.dmg}, ${assets.zip}, ${assets.latestYml}`)
    return
  }

  if (recreate) {
    run('gh', ['release', 'delete', tag, '--repo', publicRepo, '--yes'], {
      env: ghEnv(),
      allowFailure: true,
    })
  }

  writeFileSync(notesFile, releaseNotes())
  try {
    run('gh', [
      'release',
      'create',
      tag,
      assets.dmg,
      assets.zip,
      assets.latestYml,
      '--repo',
      publicRepo,
      '--title',
      tag,
      '--notes-file',
      notesFile,
      '--latest',
    ], { env: ghEnv() })
  } finally {
    if (!dryRun) rmSync(notesFile, { force: true })
  }

  console.log(`  ✔ Published GitHub Release: https://github.com/${publicRepo}/releases/tag/${tag}`)
}

function updateHomebrewTap() {
  if (!updateBrew) return

  const { dmg } = assertReleaseAssets()
  const sha256 = capture('shasum', ['-a', '256', dmg]).split(' ')[0]

  if (dryRun) {
    console.log(`\n▸ Would update Homebrew tap ${tapRepo} to ${version}`)
    console.log(`  DMG sha256: ${sha256}`)
    return
  }

  const tapDir = mkdtempSync(resolve(tmpdir(), 'audistill-homebrew-tap-'))

  try {
    const tapCloneUrl = publicToken ? publicRepoUrl(tapRepo) : `git@github.com:${tapRepo}.git`
    const tapCloneArgs = publicToken
      ? authenticatedGitArgs(['clone', tapCloneUrl, tapDir])
      : ['clone', tapCloneUrl, tapDir]
    run('git', tapCloneArgs, { cwd: dirname(tapDir) })
    git(tapDir, ['config', 'user.name', tapAuthorName])
    git(tapDir, ['config', 'user.email', tapAuthorEmail])

    const caskPath = resolve(tapDir, 'Casks/audistill.rb')
    const caskContent = `cask "audistill" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/${publicRepo}/releases/download/v#{version}/Audistill-#{version}-arm64.dmg",
      verified: "github.com/${publicRepo}/"
  name "Audistill"
  desc "Local-first audio transcription and summarization for macOS"
  homepage "https://audistill.com"

  depends_on arch: :arm64
  depends_on macos: :ventura

  app "Audistill.app"

  zap trash: [
    "~/Library/Application Support/Audistill",
    "~/Library/Preferences/com.audistill.app.plist",
    "~/Library/Saved Application State/com.audistill.app.savedState",
  ]
end
`
    writeFileSync(caskPath, caskContent)
    git(tapDir, ['add', '-A'])

    const status = gitCapture(tapDir, ['status', '--porcelain'])
    if (!status) {
      console.log('  ✔ Homebrew tap already up to date')
      return
    }

    git(tapDir, ['commit', '-m', `Update Audistill to ${version}`])
    git(tapDir, publicToken ? authenticatedGitArgs(['push']) : ['push'])
    console.log(`  ✔ Homebrew tap updated to ${version}`)
  } finally {
    if (!dryRun) rmSync(tapDir, { recursive: true, force: true })
  }
}

console.log('\n━━━ Public snapshot publish ━━━')
console.log(`  Private root: ${root}`)
console.log(`  Public repo:  ${publicRepo}`)
console.log(`  Public dir:   ${publicDir}`)
console.log(`  Version:      ${version}`)
console.log(`  Tag:          ${tag}`)

ensurePrivateCheckoutReady()
ensurePublicCheckout()
clearPublicCheckout()
exportHeadToPublicCheckout()
stageAndVerifySnapshot()
commitAndTagSnapshot()
pushSnapshot()
publishGitHubRelease()
updateHomebrewTap()

console.log('\n━━━ Done ━━━')
console.log(`  Snapshot: ${publicDir}`)
console.log(`  Commit:   ${commitMessage}`)
console.log(`  Tag:      ${tag}`)
if (publishRelease) console.log(`  Release:  https://github.com/${publicRepo}/releases/tag/${tag}`)
console.log('')
