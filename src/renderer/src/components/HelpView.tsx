import { useEffect, useMemo, useState } from 'react'
import { helpArticles, releaseNotes, type HelpArticle, type ReleaseNote } from '../generated/content-manifest'
import type { HelpTarget } from '../store/app-store'
import { RichMarkdown } from './RichMarkdown'

type HelpSelection =
  | { kind: 'help'; slug: string }
  | { kind: 'release'; version: string }
  | { kind: 'release-index' }

function normalizeVersion(version: string): string {
  return version.startsWith('v') ? version.slice(1) : version
}

function resolveTarget(target: HelpTarget | null): HelpSelection {
  if (target?.kind === 'release') {
    const requestedVersion = target.version ? normalizeVersion(target.version) : null
    const exact = requestedVersion ? releaseNotes.find((note) => note.version === requestedVersion) : null
    if (exact) return { kind: 'release', version: exact.version }
    const latest = releaseNotes[0]
    return latest ? { kind: 'release', version: latest.version } : { kind: 'release-index' }
  }

  if (target?.kind === 'release-index') {
    return { kind: 'release-index' }
  }

  if (target?.kind === 'help' && target.slug) {
    const article = helpArticles.find((item) => item.slug === target.slug)
    if (article) return { kind: 'help', slug: article.slug }
  }

  const firstArticle = helpArticles[0]
  return firstArticle ? { kind: 'help', slug: firstArticle.slug } : { kind: 'release-index' }
}

function getSelectedDocument(selection: HelpSelection):
  | { type: 'help'; article: HelpArticle }
  | { type: 'release'; note: ReleaseNote }
  | { type: 'release-index' } {
  if (selection.kind === 'help') {
    const article = helpArticles.find((item) => item.slug === selection.slug) ?? helpArticles[0]
    if (article) return { type: 'help', article }
  }

  if (selection.kind === 'release') {
    const note = releaseNotes.find((item) => item.version === selection.version) ?? releaseNotes[0]
    if (note) return { type: 'release', note }
  }

  return { type: 'release-index' }
}

function formatReleaseDate(note: ReleaseNote): string | null {
  if (!note.date) return null
  const date = new Date(`${note.date}T00:00:00`)
  if (Number.isNaN(date.getTime())) return note.date
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

export function HelpView({ target }: { target: HelpTarget | null }): React.JSX.Element {
  const resolvedTarget = useMemo(() => resolveTarget(target), [target])
  const [selection, setSelection] = useState<HelpSelection>(resolvedTarget)

  useEffect(() => {
    setSelection(resolvedTarget)
  }, [resolvedTarget])

  const selected = getSelectedDocument(selection)

  let title = 'Release Notes'
  let subtitle = 'Bundled notes for Audistill releases.'
  let markdown = releaseNotes.length > 0
    ? releaseNotes.map((note) => `- **${note.title}**${note.date ? ` — ${note.date}` : ''}`).join('\n')
    : 'No bundled Release Notes are available yet.'

  if (selected.type === 'help') {
    title = selected.article.title
    subtitle = 'Audistill Help'
    markdown = selected.article.markdown
  } else if (selected.type === 'release') {
    title = selected.note.title
    subtitle = formatReleaseDate(selected.note) ?? 'Release Notes'
    markdown = selected.note.markdown
  }

  return (
    <div className="flex-1 min-w-0 overflow-hidden bg-[var(--bg)] text-[var(--text)] flex">
      <aside className="w-64 shrink-0 border-r border-[var(--surface)] overflow-y-auto px-3 py-5">
        <div className="mb-6">
          <div className="px-2 mb-2 text-[11px] font-heading font-semibold uppercase tracking-wide text-[var(--secondary)]">
            Help
          </div>
          <div className="space-y-1">
            {helpArticles.map((article) => {
              const active = selection.kind === 'help' && selection.slug === article.slug
              return (
                <button
                  key={article.slug}
                  onClick={() => setSelection({ kind: 'help', slug: article.slug })}
                  className={`w-full text-left px-3 py-2 rounded-[10px] text-sm transition-colors ${
                    active
                      ? 'bg-[var(--surface)] text-[var(--text)]'
                      : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/60'
                  }`}
                >
                  {article.title}
                </button>
              )
            })}
          </div>
        </div>

        <div>
          <div className="px-2 mb-2 text-[11px] font-heading font-semibold uppercase tracking-wide text-[var(--secondary)]">
            Release Notes
          </div>
          <div className="space-y-1">
            <button
              onClick={() => setSelection({ kind: 'release-index' })}
              className={`w-full text-left px-3 py-2 rounded-[10px] text-sm transition-colors ${
                selection.kind === 'release-index'
                  ? 'bg-[var(--surface)] text-[var(--text)]'
                  : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/60'
              }`}
            >
              All releases
            </button>
            {releaseNotes.map((note) => {
              const active = selection.kind === 'release' && selection.version === note.version
              return (
                <button
                  key={note.version}
                  onClick={() => setSelection({ kind: 'release', version: note.version })}
                  className={`w-full text-left px-3 py-2 rounded-[10px] text-sm transition-colors ${
                    active
                      ? 'bg-[var(--surface)] text-[var(--text)]'
                      : 'text-[var(--secondary)] hover:text-[var(--text)] hover:bg-[var(--surface)]/60'
                  }`}
                >
                  v{note.version}
                </button>
              )
            })}
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-y-auto">
        <article className="max-w-3xl px-12 py-8">
          <div className="mb-6">
            <div className="text-xs font-medium text-[var(--secondary)] mb-1">{subtitle}</div>
            <h1 className="font-heading text-2xl font-semibold text-[var(--text)]">{title}</h1>
          </div>
          <div className="markdown-content text-sm leading-6 text-[var(--text)]">
            <RichMarkdown content={markdown} />
          </div>
        </article>
      </main>
    </div>
  )
}
