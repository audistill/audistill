#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'fs'
import { basename, dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

export const RELEASE_TYPES = ['added', 'improved', 'fixed']
export const SEMVER_RE = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/

const scriptDir = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(scriptDir, '..')

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

export function contentPaths(root = repoRoot) {
  const contentRoot = resolve(root, 'content')
  return {
    root: resolve(root),
    contentRoot,
    helpDir: join(contentRoot, 'help'),
    releasesDir: join(contentRoot, 'releases'),
    versionsDir: join(contentRoot, 'releases', 'versions'),
    unreleasedDir: join(contentRoot, 'releases', 'unreleased'),
    archiveDir: join(contentRoot, 'releases', 'archive'),
    manifestFile: join(resolve(root), 'src', 'renderer', 'src', 'generated', 'content-manifest.ts'),
  }
}

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return []
  return readdirSync(dir)
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => join(dir, name))
}

function stripQuotes(value) {
  const trimmed = value.trim()
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

export function parseFrontmatter(markdown, source = 'markdown') {
  const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/)
  if (!match) {
    throw new Error(`${source}: expected YAML-style frontmatter delimited by ---`)
  }

  const attributes = {}
  for (const [index, rawLine] of match[1].split(/\r?\n/).entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const lineMatch = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/)
    if (!lineMatch) {
      throw new Error(`${source}: malformed frontmatter line ${index + 1}: ${rawLine}`)
    }
    attributes[lineMatch[1]] = stripQuotes(lineMatch[2])
  }

  return { attributes, body: match[2].trim() }
}

function requiredString(attrs, key, source) {
  const value = attrs[key]
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${source}: missing required frontmatter field "${key}"`)
  }
  return value.trim()
}

function optionalString(attrs, key) {
  const value = attrs[key]
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined
}

function requireBody(body, source) {
  if (!body.trim()) {
    throw new Error(`${source}: body Markdown must not be empty`)
  }
  return body.trim()
}

function slugFromFile(file) {
  return basename(file, '.md')
}

function releaseVersionFromFile(file) {
  const name = basename(file)
  const match = name.match(/^v(.+)\.md$/)
  if (!match || !SEMVER_RE.test(match[1])) {
    throw new Error(`${file}: malformed version identifier; expected filename like v0.4.0.md`)
  }
  return match[1]
}

export function assertVersion(version, source = 'version') {
  if (typeof version !== 'string' || !SEMVER_RE.test(version)) {
    throw new Error(`${source}: malformed version identifier "${version}"`)
  }
  return version
}

function versionParts(version) {
  const core = version.split(/[+-]/)[0]
  return core.split('.').map((part) => Number(part))
}

export function compareVersionsDesc(a, b) {
  const av = versionParts(typeof a === 'string' ? a : a.version)
  const bv = versionParts(typeof b === 'string' ? b : b.version)
  for (let i = 0; i < 3; i++) {
    if (av[i] !== bv[i]) return bv[i] - av[i]
  }
  const as = typeof a === 'string' ? a : a.version
  const bs = typeof b === 'string' ? b : b.version
  return bs.localeCompare(as)
}

export function loadHelpArticles(root = repoRoot) {
  const { helpDir } = contentPaths(root)
  return listMarkdownFiles(helpDir).map((file) => {
    const { attributes, body } = parseFrontmatter(readFileSync(file, 'utf8'), file)
    const orderValue = optionalString(attributes, 'order')
    const order = orderValue === undefined ? 999 : Number(orderValue)
    if (!Number.isFinite(order)) {
      throw new Error(`${file}: frontmatter field "order" must be numeric when present`)
    }
    return {
      slug: optionalString(attributes, 'slug') ?? slugFromFile(file),
      title: requiredString(attributes, 'title', file),
      order,
      markdown: requireBody(body, file),
    }
  }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
}

export function loadVersionedReleaseNotes(root = repoRoot) {
  const { versionsDir } = contentPaths(root)
  return listMarkdownFiles(versionsDir).map((file) => {
    const filenameVersion = releaseVersionFromFile(file)
    const { attributes, body } = parseFrontmatter(readFileSync(file, 'utf8'), file)
    const version = optionalString(attributes, 'version') ?? filenameVersion
    assertVersion(version, `${file} frontmatter field "version"`)
    if (version !== filenameVersion) {
      throw new Error(`${file}: frontmatter version "${version}" must match filename v${filenameVersion}.md`)
    }
    return {
      version,
      title: requiredString(attributes, 'title', file),
      date: optionalString(attributes, 'date') ?? null,
      markdown: requireBody(body, file),
    }
  }).sort(compareVersionsDesc)
}

export function loadUnreleasedFragments(root = repoRoot) {
  const { unreleasedDir } = contentPaths(root)
  return listMarkdownFiles(unreleasedDir).map((file) => {
    const { attributes, body } = parseFrontmatter(readFileSync(file, 'utf8'), file)
    const type = requiredString(attributes, 'type', file)
    if (!RELEASE_TYPES.includes(type)) {
      throw new Error(`${file}: invalid release-note type "${type}"; expected added, improved, or fixed`)
    }
    return {
      file,
      type,
      title: requiredString(attributes, 'title', file),
      markdown: requireBody(body, file),
    }
  }).sort((a, b) => a.file.localeCompare(b.file))
}

function assertNoDuplicateSlugs(helpArticles) {
  const seen = new Set()
  for (const article of helpArticles) {
    if (seen.has(article.slug)) {
      throw new Error(`content/help: duplicate Help slug "${article.slug}"`)
    }
    seen.add(article.slug)
  }
}

function assertNoDuplicateVersions(releaseNotes) {
  const seen = new Set()
  for (const note of releaseNotes) {
    if (seen.has(note.version)) {
      throw new Error(`content/releases/versions: duplicate Release Note version "${note.version}"`)
    }
    seen.add(note.version)
  }
}

export function loadContentManifest(root = repoRoot) {
  const helpArticles = loadHelpArticles(root)
  const releaseNotes = loadVersionedReleaseNotes(root)
  loadUnreleasedFragments(root)
  assertNoDuplicateSlugs(helpArticles)
  assertNoDuplicateVersions(releaseNotes)
  return { helpArticles, releaseNotes }
}

export function validateContent(root = repoRoot) {
  loadContentManifest(root)
  return true
}

export function renderContentManifestTs(manifest) {
  if (!isPlainObject(manifest) || !Array.isArray(manifest.helpArticles) || !Array.isArray(manifest.releaseNotes)) {
    throw new Error('renderContentManifestTs: invalid manifest shape')
  }

  return `// Generated by scripts/content-system.mjs. Do not edit by hand.\n\n` +
`export interface HelpArticle {\n` +
`  slug: string\n` +
`  title: string\n` +
`  order: number\n` +
`  markdown: string\n` +
`}\n\n` +
`export interface ReleaseNote {\n` +
`  version: string\n` +
`  title: string\n` +
`  date: string | null\n` +
`  markdown: string\n` +
`}\n\n` +
`export const helpArticles: HelpArticle[] = ${JSON.stringify(manifest.helpArticles, null, 2)}\n\n` +
`export const releaseNotes: ReleaseNote[] = ${JSON.stringify(manifest.releaseNotes, null, 2)}\n`
}

export function generateContentManifest({ root = repoRoot, outFile } = {}) {
  const paths = contentPaths(root)
  const manifest = loadContentManifest(root)
  const target = outFile ? resolve(root, outFile) : paths.manifestFile
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, renderContentManifestTs(manifest))
  return { manifest, outFile: target }
}

function releaseNotePath(root, version) {
  assertVersion(version)
  return join(contentPaths(root).versionsDir, `v${version}.md`)
}

export function renderReleaseNoteMarkdown(version, fragments) {
  assertVersion(version)
  const grouped = new Map(RELEASE_TYPES.map((type) => [type, []]))
  for (const fragment of fragments) {
    if (!RELEASE_TYPES.includes(fragment.type)) {
      throw new Error(`invalid release-note type "${fragment.type}"`)
    }
    grouped.get(fragment.type).push(fragment)
  }

  const sectionTitles = { added: 'Added', improved: 'Improved', fixed: 'Fixed' }
  const sections = []
  for (const type of RELEASE_TYPES) {
    const entries = grouped.get(type)
    if (!entries || entries.length === 0) continue
    const body = entries
      .sort((a, b) => a.title.localeCompare(b.title) || (a.file ?? '').localeCompare(b.file ?? ''))
      .map((fragment) => `### ${fragment.title}\n\n${fragment.markdown.trim()}`)
      .join('\n\n')
    sections.push(`## ${sectionTitles[type]}\n\n${body}`)
  }

  return `---\ntitle: Audistill ${version}\nversion: ${version}\n---\n\n${sections.join('\n\n')}\n`
}

export function readVersionedReleaseNoteBody(root, version) {
  const file = releaseNotePath(root, version)
  if (!existsSync(file)) {
    throw new Error(`Release Note for v${version} does not exist at ${file}`)
  }
  const { body } = parseFrontmatter(readFileSync(file, 'utf8'), file)
  requireBody(body, file)
  return body.trim()
}

export function compileReleaseNotes({ root = repoRoot, version, force = false } = {}) {
  assertVersion(version, 'release-note version')
  const paths = contentPaths(root)
  const fragments = loadUnreleasedFragments(root)
  const target = releaseNotePath(root, version)
  const targetExists = existsSync(target)

  if (fragments.length === 0) {
    if (targetExists) {
      return { action: 'reused', version, releaseNotePath: target, archivedFiles: [] }
    }
    throw new Error(`No unreleased release-note fragments and no versioned Release Note for v${version}. Add fragments under content/releases/unreleased/ or create content/releases/versions/v${version}.md.`)
  }

  const archiveVersionDir = join(paths.archiveDir, `v${version}`)
  const archiveTargets = fragments.map((fragment) => ({
    fragment,
    archivePath: join(archiveVersionDir, basename(fragment.file)),
  }))
  for (const { archivePath } of archiveTargets) {
    if (existsSync(archivePath)) {
      throw new Error(`${archivePath}: archived release-note fragment already exists`)
    }
  }

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, renderReleaseNoteMarkdown(version, fragments))

  mkdirSync(archiveVersionDir, { recursive: true })
  const archivedFiles = []
  for (const { fragment, archivePath } of archiveTargets) {
    renameSync(fragment.file, archivePath)
    archivedFiles.push(archivePath)
  }

  // Re-validate the generated note and now-empty fragment directory.
  validateContent(root)

  return {
    action: targetExists || force ? 'updated' : 'generated',
    version,
    releaseNotePath: target,
    archivedFiles,
  }
}

function ensureContentDirectories(root = repoRoot) {
  const paths = contentPaths(root)
  for (const dir of [paths.helpDir, paths.versionsDir, paths.unreleasedDir, paths.archiveDir]) {
    mkdirSync(dir, { recursive: true })
    if (!statSync(dir).isDirectory()) {
      throw new Error(`${dir}: expected directory`)
    }
  }
}

function argValue(args, name) {
  const idx = args.indexOf(name)
  if (idx < 0) return null
  return args[idx + 1] ?? null
}

async function main() {
  const [, , command, ...args] = process.argv
  try {
    if (command === 'generate') {
      ensureContentDirectories(repoRoot)
      const { outFile } = generateContentManifest({ root: repoRoot })
      console.log(`Generated ${outFile}`)
      return
    }

    if (command === 'validate') {
      ensureContentDirectories(repoRoot)
      validateContent(repoRoot)
      console.log('Content is valid')
      return
    }

    if (command === 'compile-release-notes') {
      ensureContentDirectories(repoRoot)
      const version = argValue(args, '--version')
      if (!version) throw new Error('compile-release-notes requires --version <x.y.z>')
      const result = compileReleaseNotes({ root: repoRoot, version, force: args.includes('--force') })
      generateContentManifest({ root: repoRoot })
      console.log(`${result.action} Release Note for v${version}`)
      return
    }

    throw new Error(`Unknown content-system command "${command ?? ''}". Use generate, validate, or compile-release-notes.`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main()
}
