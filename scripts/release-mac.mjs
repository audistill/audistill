#!/usr/bin/env node

/**
 * Release pipeline for macOS.
 * Runs: preflight → typecheck → test → build → package+sign+notarize → verify
 *
 * Usage:
 *   pnpm release:mac
 *   pnpm release:mac --bump patch|minor|major
 *   pnpm release:mac --publish   (uploads to GitHub Releases)
 */

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

const args = process.argv.slice(2)
const bump = args.find((_, i, a) => a[i - 1] === '--bump') || null
const publish = args.includes('--publish')

const root = resolve(import.meta.dirname, '..')

function run(cmd, opts = {}) {
  console.log(`\n▸ ${cmd}`)
  execSync(cmd, { cwd: root, stdio: 'inherit', ...opts })
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
  const identities = execSync('security find-identity -v -p codesigning', { encoding: 'utf8' })
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

if (!existsSync(process.env.APPLE_API_KEY.replace('~', process.env.HOME))) {
  fail(`API key file not found at: ${process.env.APPLE_API_KEY}`)
}
console.log('  ✔ Notarization credentials set')

// ─── Version bump ───────────────────────────────────────────────────────────

if (bump) {
  console.log('\n━━━ Version bump ━━━')
  run(`npm version ${bump} --no-git-tag-version`)
}

// ─── Typecheck ──────────────────────────────────────────────────────────────

console.log('\n━━━ Typecheck ━━━')
run('pnpm run typecheck')

// ─── Tests ──────────────────────────────────────────────────────────────────

console.log('\n━━━ Tests ━━━')
run('pnpm run test')

// ─── Build ──────────────────────────────────────────────────────────────────

console.log('\n━━━ Build (electron-vite) ━━━')
run('pnpm run build')

// ─── Package + Sign + Notarize ──────────────────────────────────────────────

console.log('\n━━━ Package + Sign + Notarize ━━━')
const publishFlag = publish ? ' --publish always' : ''
run(`pnpm exec electron-builder --mac${publishFlag}`)

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

// Notarize + staple the DMG (electron-builder only notarizes the .app inside the zip)
const dmg = execSync('ls dist/*.dmg 2>/dev/null | head -1', { cwd: root, encoding: 'utf8' }).trim()

if (dmg) {
  console.log('\n━━━ Notarize DMG ━━━')
  const apiKey = process.env.APPLE_API_KEY.replace('~', process.env.HOME)
  run(`xcrun notarytool submit "${dmg}" --key "${apiKey}" --key-id "${process.env.APPLE_API_KEY_ID}" --issuer "${process.env.APPLE_API_ISSUER}" --wait`)
  run(`xcrun stapler staple "${dmg}"`)
  console.log('  ✔ DMG notarized and stapled')

  // Verify
  run(`xcrun stapler validate "${dmg}"`)
  console.log('  ✔ Stapler validation passed')

  const size = execSync(`du -h "${dmg}"`, { cwd: root, encoding: 'utf8' }).trim()
  console.log(`\n━━━ Done ━━━`)
  console.log(`  📦 ${dmg}`)
  console.log(`  📏 ${size.split('\t')[0]}`)
}

if (publish) {
  console.log('  🚀 Uploaded to GitHub Releases')
}

console.log('')
