#!/usr/bin/env node

/**
 * End-to-end public release pipeline.
 *
 * Keeps private development history in the private repo, then publishes a
 * squashed public source snapshot plus GitHub Release assets and Homebrew cask.
 *
 * Typical flow:
 *   AUDISTILL_PUBLIC_GH_TOKEN=... pnpm release:public -- --bump patch
 *
 * Retry an already-built version:
 *   AUDISTILL_PUBLIC_GH_TOKEN=... pnpm release:public -- --no-bump --skip-build --recreate
 */

import { spawnSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const root = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)

const DEFAULT_PUBLIC_REPO = 'audistill/audistill'
const DEFAULT_TAP_REPO = 'audistill/homebrew-tap'
const BUMP_LEVELS = new Set(['patch', 'minor', 'major'])

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

function usage() {
  console.log(`Run the full Audistill public release pipeline.

Usage:
  node scripts/release-public.mjs --bump <patch|minor|major> [options]
  node scripts/release-public.mjs --no-bump [options]

Options:
  --bump <level>             Bump package.json before releasing (patch, minor, major)
  --no-bump                  Release the current package.json version
  --skip-build               Reuse existing dist artifacts instead of running pnpm release:mac
  --recreate                 Recreate the public tag/GitHub Release if it already exists
  --public-repo <owner/repo> Public GitHub repo (default: ${DEFAULT_PUBLIC_REPO})
  --public-dir <path>        Public checkout path passed through to snapshot:public
  --tap-repo <owner/repo>    Homebrew tap repo (default: ${DEFAULT_TAP_REPO})
  --skip-verify             Skip final GitHub/download verification
  --help                     Show this help

Environment:
  AUDISTILL_PUBLIC_GH_TOKEN  Required bot/machine-user token for public release publishing

Examples:
  AUDISTILL_PUBLIC_GH_TOKEN=... pnpm release:public -- --bump patch
  AUDISTILL_PUBLIC_GH_TOKEN=... pnpm release:public -- --no-bump --skip-build --recreate
`)
}

if (hasFlag('--help')) {
  usage()
  process.exit(0)
}

const bump = argValue('--bump')
const noBump = hasFlag('--no-bump')
const skipBuild = hasFlag('--skip-build')
const recreate = hasFlag('--recreate')
const skipVerify = hasFlag('--skip-verify')
const publicRepo = argValue('--public-repo', DEFAULT_PUBLIC_REPO)
const publicDir = argValue('--public-dir')
const tapRepo = argValue('--tap-repo', DEFAULT_TAP_REPO)
const publicToken = process.env.AUDISTILL_PUBLIC_GH_TOKEN || ''

function fail(message) {
  console.error(`\n✖ ${message}`)
  process.exit(1)
}

function commandLabel(command, commandArgs) {
  return [command, ...commandArgs]
    .map((part) => (part.includes(' ') ? JSON.stringify(part) : part))
    .join(' ')
}

function run(command, commandArgs, options = {}) {
  const cwd = options.cwd || root
  const env = options.env || process.env
  const label = commandLabel(command, commandArgs)
  console.log(`\n▸ ${label}`)

  const result = spawnSync(command, commandArgs, {
    cwd,
    env,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: options.maxBuffer ?? 512 * 1024 * 1024,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : ['inherit', 'inherit', 'inherit'],
  })

  if (result.status !== 0) {
    if (options.capture && result.stderr) process.stderr.write(result.stderr)
    fail(`Command failed: ${label}`)
  }

  return options.capture ? (result.stdout || '').trim() : ''
}

function capture(command, commandArgs, options = {}) {
  return run(command, commandArgs, { ...options, capture: true })
}

function git(gitArgs, options = {}) {
  return run('git', gitArgs, options)
}

function gitCapture(gitArgs, options = {}) {
  return capture('git', gitArgs, options)
}

function ghEnv() {
  return { ...process.env, GH_TOKEN: publicToken }
}

function readVersion() {
  return JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
}

function assertReleaseAssets(version) {
  const paths = [
    resolve(root, `dist/Audistill-${version}-arm64.dmg`),
    resolve(root, `dist/Audistill-${version}-arm64-mac.zip`),
    resolve(root, 'dist/latest-mac.yml'),
  ]

  for (const path of paths) {
    if (!existsSync(path)) {
      fail(`Missing release artifact: ${path}. Run without --skip-build to build it.`)
    }
  }
}

function ensureArguments() {
  if (bump && noBump) fail('Use either --bump or --no-bump, not both')
  if (!bump && !noBump) fail('Choose --bump <patch|minor|major> or --no-bump')
  if (bump && !BUMP_LEVELS.has(bump)) {
    fail(`Unsupported bump level "${bump}". Expected patch, minor, or major.`)
  }
  if (!publicToken) {
    fail('AUDISTILL_PUBLIC_GH_TOKEN is not set. Export the audistill-bot token before releasing.')
  }
}

function ensurePrivateCheckoutReady() {
  const gitRoot = gitCapture(['rev-parse', '--show-toplevel'])
  if (resolve(gitRoot) !== root) fail(`Expected repo root ${root}, got ${gitRoot}`)

  const origin = gitCapture(['remote', 'get-url', 'origin'])
  if (/github\.com[:/]audistill\/audistill(?:\.git)?$/.test(origin)) {
    fail(`origin still points at the public repo (${origin}). Expected the private dev repo.`)
  }

  const status = gitCapture(['status', '--porcelain'])
  if (status) {
    fail('Private checkout has uncommitted changes. Commit/stash them before starting a release.')
  }
}

function ensurePublicTokenReady() {
  const login = capture('gh', ['api', 'user', '--jq', '.login'], { env: ghEnv() })
  console.log(`  ✔ Public GitHub token user: ${login}`)

  for (const repo of [publicRepo, tapRepo]) {
    const canPush = capture('gh', ['api', `repos/${repo}`, '--jq', '.permissions.push'], { env: ghEnv() })
    if (canPush !== 'true') fail(`Token user cannot push to ${repo}`)
    console.log(`  ✔ Token can push to ${repo}`)
  }
}

function bumpVersionIfRequested() {
  if (!bump) return
  run('npm', ['version', bump, '--no-git-tag-version'])
}

function compileReleaseNotes(version) {
  run('node', ['scripts/content-system.mjs', 'compile-release-notes', '--version', version])
}

function buildRelease(version) {
  if (skipBuild) {
    assertReleaseAssets(version)
    console.log('  ✔ Reusing existing dist artifacts')
    return
  }

  run('pnpm', ['release:mac'])
}

function commitReleaseChanges(version) {
  git(['add', 'package.json', 'pnpm-lock.yaml', 'content', 'src/renderer/src/generated/content-manifest.ts'])
  const staged = gitCapture(['diff', '--cached', '--name-only'])

  if (staged) {
    git(['commit', '-m', `v${version}`])
  } else {
    console.log('  ✔ No version/content changes to commit')
  }
}

function ensureNoPostBuildDrift() {
  const status = gitCapture(['status', '--porcelain'])
  if (status) {
    fail('Build changed tracked files after the release commit. Review the working tree, amend the release commit, then rerun with --no-bump.')
  }
}

function pushPrivateRelease() {
  git(['push'])
}

function publishPublicSnapshot() {
  const snapshotArgs = ['snapshot:public', '--', '--init', '--push', '--publish-release', '--update-brew']
  if (recreate) snapshotArgs.push('--recreate')
  if (publicRepo !== DEFAULT_PUBLIC_REPO) snapshotArgs.push('--public-repo', publicRepo)
  if (tapRepo !== DEFAULT_TAP_REPO) snapshotArgs.push('--tap-repo', tapRepo)
  if (publicDir) snapshotArgs.push('--public-dir', publicDir)

  run('pnpm', snapshotArgs, { env: process.env })
}

function verifyPublicRelease(version) {
  if (skipVerify) return

  const tag = `v${version}`
  const releaseSummary = capture('gh', [
    'release',
    'view',
    tag,
    '--repo',
    publicRepo,
    '--json',
    'tagName,author,assets',
    '--jq',
    '{tag:.tagName, author:.author.login, assets:[.assets[].name]}',
  ], { env: ghEnv() })
  console.log(`\n  ✔ GitHub Release verified: ${releaseSummary}`)

  const downloadStatus = capture('curl', [
    '-sI',
    '-L',
    '-o',
    '/dev/null',
    '-w',
    '%{http_code}',
    'https://audistill.com/download',
  ], { cwd: root })
  if (downloadStatus !== '200') fail(`https://audistill.com/download returned HTTP ${downloadStatus}`)
  console.log('  ✔ Download route resolves successfully')
}

console.log('\n━━━ Audistill public release ━━━')

ensureArguments()
ensurePrivateCheckoutReady()
ensurePublicTokenReady()
bumpVersionIfRequested()
const version = readVersion()
console.log(`\n  Version: ${version}`)
compileReleaseNotes(version)
commitReleaseChanges(version)
buildRelease(version)
ensureNoPostBuildDrift()
pushPrivateRelease()
publishPublicSnapshot()
verifyPublicRelease(version)

console.log('\n━━━ Done ━━━')
console.log(`  Released: https://github.com/${publicRepo}/releases/tag/v${version}`)
console.log('')
