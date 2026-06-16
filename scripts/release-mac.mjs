#!/usr/bin/env node

import { execSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

const ROOT = resolve(import.meta.dirname, '..')
const args = process.argv.slice(2)
const bumpFlag = args.find((a) => a.startsWith('--bump'))
const bumpType = bumpFlag?.split('=')[1] || (bumpFlag ? args[args.indexOf(bumpFlag) + 1] : null)

function run(cmd, opts = {}) {
  console.log(`\n  → ${cmd}`)
  execSync(cmd, { stdio: 'inherit', cwd: ROOT, ...opts })
}

function fail(msg) {
  console.error(`\n  ✗ ${msg}`)
  process.exit(1)
}

function check(condition, msg) {
  if (!condition) fail(msg)
}

// ─── Preflight ─────────────────────────────────────────────────────

console.log('\n━━━ Preflight checks ━━━')

check(
  process.env.CSC_NAME || process.env.CSC_LINK,
  'No signing identity. Set CSC_NAME or CSC_LINK + CSC_KEY_PASSWORD.'
)

if (process.env.CSC_NAME) {
  try {
    const output = execSync(`security find-identity -v -p codesigning`, { encoding: 'utf-8' })
    check(output.includes(process.env.CSC_NAME), `Identity "${process.env.CSC_NAME}" not found in Keychain.`)
    console.log(`  ✓ Signing identity: ${process.env.CSC_NAME}`)
  } catch {
    fail('Could not query Keychain for signing identities.')
  }
}

const hasNotarizeCreds =
  (process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER) ||
  (process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID)

check(hasNotarizeCreds, 'Notarization credentials missing. Set APPLE_API_KEY + APPLE_API_KEY_ID + APPLE_API_ISSUER (or APPLE_ID + APPLE_APP_SPECIFIC_PASSWORD + APPLE_TEAM_ID).')
console.log('  ✓ Notarization credentials present')

// ─── Version bump ──────────────────────────────────────────────────

if (bumpType) {
  check(['patch', 'minor', 'major'].includes(bumpType), `Invalid bump type: ${bumpType}. Use patch, minor, or major.`)
  console.log(`\n━━━ Version bump: ${bumpType} ━━━`)
  run(`npm version ${bumpType} --no-git-tag-version`)
}

// ─── Typecheck ─────────────────────────────────────────────────────

console.log('\n━━━ Typecheck ━━━')
run('pnpm run typecheck:web')

// ─── Tests ─────────────────────────────────────────────────────────

console.log('\n━━━ Tests ━━━')
try {
  run('pnpm run test --run', { stdio: 'pipe' })
  console.log('  ✓ Tests passed')
} catch {
  fail('Tests failed. Fix test failures before releasing.')
}

// ─── Build ─────────────────────────────────────────────────────────

console.log('\n━━━ Build (electron-vite) ━━━')
run('pnpm run build')

// ─── Package, sign, notarize ───────────────────────────────────────

console.log('\n━━━ Package + Sign + Notarize ━━━')
run('electron-builder --mac')

// ─── Post-build verification ───────────────────────────────────────

console.log('\n━━━ Post-build verification ━━━')

const appPath = resolve(ROOT, 'dist/mac-arm64/Audistill.app')
check(existsSync(appPath), `Built app not found at ${appPath}`)

try {
  execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'pipe' })
  console.log('  ✓ codesign --verify passed')
} catch {
  fail('codesign verification failed.')
}

try {
  const spctlOutput = execSync(`spctl --assess --verbose=4 --type execute "${appPath}" 2>&1`, { encoding: 'utf-8' })
  console.log(`  ✓ spctl: ${spctlOutput.trim()}`)
} catch (e) {
  console.warn(`  ⚠ spctl assess: ${e.message || 'failed (may require notarization ticket stapled)'}`)
}

// Find DMG
const { readdirSync } = await import('fs')
const distDir = resolve(ROOT, 'dist')
const dmg = readdirSync(distDir).find((f) => f.endsWith('.dmg'))
if (dmg) {
  const dmgPath = resolve(distDir, dmg)
  try {
    execSync(`xcrun stapler validate "${dmgPath}"`, { stdio: 'pipe' })
    console.log(`  ✓ stapler validate: ${dmg}`)
  } catch {
    console.warn(`  ⚠ stapler validate failed for ${dmg} (notarization may still be processing)`)
  }

  const { statSync } = await import('fs')
  const sizeMB = (statSync(dmgPath).size / 1024 / 1024).toFixed(1)
  console.log(`\n━━━ Done ━━━`)
  console.log(`  📦 ${dmgPath}`)
  console.log(`  📏 ${sizeMB} MB`)
} else {
  console.log('\n━━━ Done ━━━')
  console.log(`  📦 ${appPath}`)
}
