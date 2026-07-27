import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { tmpdir } from 'os'
import { describe, expect, it } from 'vitest'
import {
  compileReleaseNotes,
  generateContentManifest,
  loadContentManifest,
  validateContent,
} from './content-system.mjs'

function makeRoot() {
  const root = mkdtempSync(join(tmpdir(), 'audistill-content-'))
  mkdirSync(join(root, 'content', 'help'), { recursive: true })
  mkdirSync(join(root, 'content', 'releases', 'versions'), { recursive: true })
  mkdirSync(join(root, 'content', 'releases', 'unreleased'), { recursive: true })
  mkdirSync(join(root, 'content', 'releases', 'archive'), { recursive: true })
  return root
}

function write(root, path, content) {
  const fullPath = join(root, path)
  mkdirSync(join(fullPath, '..'), { recursive: true })
  writeFileSync(fullPath, content)
  return fullPath
}

function seedValidContent(root) {
  write(root, 'content/help/getting-started.md', `---
title: Getting Started
order: 10
---

Start with an Episode.
`)
  write(root, 'content/releases/versions/v1.0.0.md', `---
title: Audistill 1.0.0
version: 1.0.0
---

## Added

Baseline release.
`)
}

describe('content manifest generation and validation', () => {
  it('generates typed renderer content from Help articles and versioned Release Notes', () => {
    const root = makeRoot()
    seedValidContent(root)

    const { manifest, outFile } = generateContentManifest({ root })

    expect(manifest.helpArticles).toMatchObject([
      { slug: 'getting-started', title: 'Getting Started', order: 10, markdown: 'Start with an Episode.' },
    ])
    expect(manifest.releaseNotes).toMatchObject([
      { version: '1.0.0', title: 'Audistill 1.0.0', markdown: '## Added\n\nBaseline release.' },
    ])
    expect(readFileSync(outFile, 'utf8')).toContain('export const helpArticles')
    expect(readFileSync(outFile, 'utf8')).toContain('export const releaseNotes')
  })

  it('rejects missing titles', () => {
    const root = makeRoot()
    write(root, 'content/help/no-title.md', `---
order: 10
---

Body.
`)
    write(root, 'content/releases/versions/v1.0.0.md', `---
title: Audistill 1.0.0
version: 1.0.0
---

Body.
`)

    expect(() => loadContentManifest(root)).toThrow(/missing required frontmatter field "title"/)
  })

  it('rejects invalid release-note fragment types', () => {
    const root = makeRoot()
    seedValidContent(root)
    write(root, 'content/releases/unreleased/bad.md', `---
type: changed
title: Bad fragment
---

Body.
`)

    expect(() => validateContent(root)).toThrow(/invalid release-note type "changed"/)
  })

  it('rejects empty bodies', () => {
    const root = makeRoot()
    write(root, 'content/help/empty.md', `---
title: Empty
---

`)
    write(root, 'content/releases/versions/v1.0.0.md', `---
title: Audistill 1.0.0
version: 1.0.0
---

Body.
`)

    expect(() => validateContent(root)).toThrow(/body Markdown must not be empty/)
  })

  it('rejects malformed version identifiers', () => {
    const root = makeRoot()
    write(root, 'content/help/getting-started.md', `---
title: Getting Started
---

Body.
`)
    write(root, 'content/releases/versions/release-1.md', `---
title: Release 1
version: 1
---

Body.
`)

    expect(() => validateContent(root)).toThrow(/malformed version identifier/)
  })
})

describe('release-note compilation', () => {
  it('groups fragments, writes a versioned Release Note, and archives consumed fragments', () => {
    const root = makeRoot()
    write(root, 'content/help/getting-started.md', `---
title: Getting Started
---

Body.
`)
    write(root, 'content/releases/unreleased/feature.md', `---
type: added
title: New Help view
---

Open bundled Help from the sidebar.
`)
    write(root, 'content/releases/unreleased/polish.md', `---
type: improved
title: Better update banner
---

What's New opens local notes.
`)
    write(root, 'content/releases/unreleased/fix.md', `---
type: fixed
title: Release link fallback
---

Missing versions fall back to the latest bundled note.
`)

    const result = compileReleaseNotes({ root, version: '1.2.3' })
    const notePath = join(root, 'content', 'releases', 'versions', 'v1.2.3.md')
    const note = readFileSync(notePath, 'utf8')

    expect(result.action).toBe('generated')
    expect(note).toContain('## Added')
    expect(note).toContain('### New Help view')
    expect(note).toContain('## Improved')
    expect(note).toContain('### Better update banner')
    expect(note).toContain('## Fixed')
    expect(note).toContain('### Release link fallback')
    expect(existsSync(join(root, 'content', 'releases', 'archive', 'v1.2.3', 'feature.md'))).toBe(true)
    expect(existsSync(join(root, 'content', 'releases', 'unreleased', 'feature.md'))).toBe(false)
  })

  it('fails clearly when there are no fragments and no versioned Release Note', () => {
    const root = makeRoot()
    write(root, 'content/help/getting-started.md', `---
title: Getting Started
---

Body.
`)

    expect(() => compileReleaseNotes({ root, version: '1.2.3' })).toThrow(/No unreleased release-note fragments and no versioned Release Note/)
  })

  it('reuses an existing versioned Release Note for recreate-style runs with no fragments', () => {
    const root = makeRoot()
    seedValidContent(root)
    const notePath = join(root, 'content', 'releases', 'versions', 'v1.0.0.md')
    const before = readFileSync(notePath, 'utf8')

    const result = compileReleaseNotes({ root, version: '1.0.0' })

    expect(result.action).toBe('reused')
    expect(result.archivedFiles).toEqual([])
    expect(readFileSync(notePath, 'utf8')).toBe(before)
  })
})
