#!/usr/bin/env node

/**
 * Release pipeline for macOS.
 * Runs: preflight → typecheck → test → build → package+sign+notarize → verify → publish → update brew
 *
 * Usage:
 *   pnpm release:mac                        (build + verify only, no publish)
 *   pnpm release:mac --bump patch           (bump version first)
 *   pnpm release:mac --publish              (build + publish to GitHub Releases + update Homebrew tap)
 *   pnpm release:mac --bump minor --publish (bump + build + publish + update tap)
 *   pnpm release:mac --publish --recreate   (delete existing release and re-publish same version)
 */

import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)
const bump = args.find((_, i, a) => a[i - 1] === '--bump') || null
const publish = args.includes('--publish')
const recreate = args.includes('--recreate')

const root = resolve(import.meta.dirname, '..')

function run(cmd, opts = {}) {
  console.log(`\n▸ ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit', ...opts })
}

function runCapture(cmd, opts = {}) {
  return execSync(cmd, { cwd: root, encoding: 'utf8', ...opts }).trim()
}

function fail(msg) {
  console.error(`\n✖ ${msg}`)
  process.exit(1)
}

// ─── Preflight ──────────────────────────────────────────────────────────────

console.log('\n━━━ Preflight checks ━━━')

if (!process.env.CSC_NAME) {
  fail('CSC_NAME is not set. Export your signing identity.')
}

try {
  const identities = runCapture('security find-identity -v -p codesigning')
  if (!identities.includes(process.env.CSC_NAME)) {
    fail(`Signing identity "${process.env.CSC_NAME}" not found in Keychain.`)
  }
  console.log(`  ✔ Signing identity found: ${process.env.CSC_NAME}`)
} catch {
  fail('Could not query Keychain for signing identities.')
}

if (!process.env.APPLE_API_KEY_ID || !process.env.APPLE_API_ISSUER || !process.env.APPLE_API_KEY) {
  fail('Notarization credentials missing. Set APPLE_API_KEY_ID, APPLE_API_ISSUER, and APPLE_API_KEY.')
}

const apiKeyPath = process.env.APPLE_API_KEY.replace('~', process.env.HOME)
if (!existsSync(apiKeyPath)) {
  fail(`API key file not found at: ${process.env.APPLE_API_KEY}`)
}
console.log('  ✔ Notarization credentials set')

if (publish) {
  try {
    runCapture('gh auth status')
  } catch {
    fail('GitHub CLI not authenticated. Run: gh auth login')
  }
  console.log('  ✔ GitHub CLI authenticated')
}

// ─── Version bump ───────────────────────────────────────────────────────────

if (bump) {
  console.log('\n━━━ Version bump ━━━')
  run(`npm version ${bump} --no-git-tag-version`)
}

const version = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')).version
console.log(`\n  Version: ${version}`)

// ─── Typecheck ──────────────────────────────────────────────────────────────

console.log('\n━━━ Typecheck ━━━')
run('pnpm run typecheck')

// ─── Tests ──────────────────────────────────────────────────────────────────

console.log('\n━━━ Tests ━━━')
run('pnpm run test')

// ─── Build ──────────────────────────────────────────────────────────────────

console.log('\n━━━ Build (electron-vite) ━━━')
run('OFFICIAL_BUILD=true pnpm run build')

// ─── Package + Sign + Notarize ──────────────────────────────────────────────

console.log('\n━━━ Package + Sign + Notarize ━━━')
run('pnpm exec electron-builder --mac')

// ─── Post-build verification ────────────────────────────────────────────────

console.log('\n━━━ Verification ━━━')

const appPath = resolve(root, 'dist/mac-arm64/Audistill.app')

if (!existsSync(appPath)) {
  fail(`App not found at ${appPath}`)
}

try {
  run(`codesign --verify --deep --strict "${appPath}"`)
  console.log('  ✔ Code signature valid')
} catch {
  fail('Code signature verification failed.')
}

try {
  run(`spctl --assess --verbose=4 --type execute "${appPath}"`)
  console.log('  ✔ Gatekeeper assessment passed')
} catch {
  fail('Gatekeeper assessment failed (spctl).')
}

// ─── Notarize + staple DMG ──────────────────────────────────────────────────

const dmg = runCapture('ls dist/*.dmg 2>/dev/null | head -1')

if (dmg) {
  console.log('\n━━━ Notarize DMG ━━━')
  run(`xcrun notarytool submit "${dmg}" --key "${apiKeyPath}" --key-id "${process.env.APPLE_API_KEY_ID}" --issuer "${process.env.APPLE_API_ISSUER}" --wait`)
  run(`xcrun stapler staple "${dmg}"`)
  console.log('  ✔ DMG notarized and stapled')

  run(`xcrun stapler validate "${dmg}"`)
  console.log('  ✔ Stapler validation passed')
}

// ─── Publish to GitHub Releases ─────────────────────────────────────────────

if (publish) {
  console.log('\n━━━ Publish to GitHub Releases ━━━')

  const tag = `v${version}`
  const zip = runCapture('ls dist/*-mac.zip 2>/dev/null | head -1')
  const latestYml = resolve(root, 'dist/latest-mac.yml')

  const assets = [dmg, zip, latestYml].filter(Boolean).map(f => `"${f}"`).join(' ')

  const notes = `## Download

- **[Audistill-${version}-arm64.dmg](https://github.com/audistill/audistill/releases/download/${tag}/Audistill-${version}-arm64.dmg)** — drag to Applications
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

  // Commit version bump if applicable
  if (bump) {
    run(`git add package.json`)
    run(`git commit -m "v${version}"`)
    run(`git push`)
  }

  // Delete existing release if --recreate
  if (recreate) {
    try {
      run(`gh release delete ${tag} --yes --cleanup-tag`)
      console.log(`  ✔ Deleted existing release ${tag}`)
    } catch {
      // Release may not exist yet — that's fine
    }
  }

  // Create the release
  run(`gh release create ${tag} ${assets} --title "${tag}" --notes "${notes.replace(/"/g, '\\"')}" --latest`)

  console.log(`  ✔ Published: https://github.com/audistill/audistill/releases/tag/${tag}`)

  // Wait for GitHub CDN to propagate release assets
  console.log('  ⏳ Waiting for release assets to propagate...')
  const dmgUrl = `https://github.com/audistill/audistill/releases/download/${tag}/Audistill-${version}-arm64.dmg`
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      const status = runCapture(`curl -sI -o /dev/null -w '%{http_code}' -L "${dmgUrl}"`)
      if (status === '200') {
        console.log(`  ✔ Assets available (attempt ${attempt})`)
        break
      }
    } catch { /* ignore */ }
    if (attempt === 20) fail('Release assets not available after 60s — check GitHub.')
    await new Promise(r => setTimeout(r, 3000))
  }

  // ─── Update Homebrew tap ────────────────────────────────────────────────

  console.log('\n━━━ Update Homebrew tap ━━━')

  const sha256 = runCapture(`shasum -a 256 "${dmg}"`).split(' ')[0]

  const tapDir = '/tmp/homebrew-tap-update'
  run(`rm -rf ${tapDir}`)
  run(`git clone git@github.com:audistill/homebrew-tap.git ${tapDir}`)

  const caskPath = `${tapDir}/Casks/audistill.rb`
  const caskContent = `cask "audistill" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/audistill/audistill/releases/download/v#{version}/Audistill-#{version}-arm64.dmg"
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

  const { writeFileSync } = await import('fs')
  writeFileSync(caskPath, caskContent)

  run(`git -C ${tapDir} add -A`)
  run(`git -C ${tapDir} commit -m "Update Audistill to ${version}"`)
  run(`git -C ${tapDir} push`)
  run(`rm -rf ${tapDir}`)

  console.log(`  ✔ Homebrew tap updated to ${version}`)
}

// ─── Summary ────────────────────────────────────────────────────────────────

const size = dmg ? runCapture(`du -h "${dmg}"`).split('\t')[0] : '?'
console.log(`\n━━━ Done ━━━`)
console.log(`  📦 ${dmg || 'no DMG found'}`)
console.log(`  📏 ${size}`)
if (publish) {
  console.log(`  🚀 GitHub Release: https://github.com/audistill/audistill/releases/tag/v${version}`)
  console.log(`  🍺 Homebrew: brew install --cask audistill`)
}
console.log('')
