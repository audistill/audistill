import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('recording prototype launcher', () => {
  it('rebuilds better-sqlite3 for Electron before starting', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      scripts: Record<string, string>
    }

    expect(packageJson.scripts['predev:prototype:recording']).toBe(
      'rm -rf node_modules/better-sqlite3/build && electron-rebuild -f -w better-sqlite3 --build-from-source'
    )
  })
})
