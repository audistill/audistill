import { useState, useEffect, useRef, type ComponentPropsWithoutRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkMark } from 'remark-mark-highlight'

interface RichMarkdownProps {
  content: string
  streaming?: boolean
}

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
let mermaidInstance: typeof import('mermaid')['default'] | null = null
let lastThemeMode: 'light' | 'dark' | null = null
let renderCounter = 0

function getMermaid(): Promise<typeof import('mermaid')['default']> {
  if (mermaidInstance) return Promise.resolve(mermaidInstance)
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((m) => {
      mermaidInstance = m.default
      return m.default
    })
  }
  return mermaidPromise
}

/**
 * Resolve the current color mode and apply branded Mermaid theming.
 * Re-initializes when the mode has changed (light ↔ dark).
 *
 * Design intent (brand-kit.md):
 *   "Warm, paper-inspired palette… terracotta accent provides a gentle glow
 *    — like a reading lamp."
 *
 * Light mode: sand paper nodes, terracotta ink borders & edges
 * Dark mode: elevated surface nodes, terracotta glow borders & edges
 */
function applyMermaidTheme(mermaid: typeof import('mermaid')['default']): void {
  const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const mode = isDark ? 'dark' : 'light'

  // Skip re-init if mode hasn't changed
  if (lastThemeMode === mode) return
  lastThemeMode = mode

  const root = document.documentElement
  const style = getComputedStyle(root)

  // Read live CSS custom properties
  const bg = style.getPropertyValue('--bg').trim()
  const surface = style.getPropertyValue('--surface').trim()
  const border = style.getPropertyValue('--border').trim()
  const text = style.getPropertyValue('--text').trim()
  const secondary = style.getPropertyValue('--secondary').trim()
  const accent = style.getPropertyValue('--accent').trim()

  // Fallback values per brand-kit
  const t = {
    bg: bg || (isDark ? '#141413' : '#faf9f5'),
    surface: surface || (isDark ? '#1e1e1c' : '#e8e6dc'),
    border: border || (isDark ? '#2a2a28' : '#d4d2c8'),
    text: text || (isDark ? '#faf9f5' : '#141413'),
    secondary: secondary || (isDark ? '#c2c0b8' : '#7a7870'),
    accent: accent || '#d97757',
  }

  // Node fill: needs to contrast from the container background.
  // Light: use surface (sand) — sits on parchment container
  // Dark: use border shade (slightly elevated) — sits on surface container
  const nodeFill = isDark ? t.border : t.surface

  // Edge color: in dark mode, use lighter terracotta for visibility
  const edgeColor = isDark ? '#e89b7f' : t.accent

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      // — Node fills & borders —
      primaryColor: nodeFill,
      primaryTextColor: t.text,
      primaryBorderColor: t.accent,
      secondaryColor: nodeFill,
      secondaryTextColor: t.text,
      secondaryBorderColor: t.accent,
      tertiaryColor: nodeFill,
      tertiaryTextColor: t.text,
      tertiaryBorderColor: t.accent,

      // Node-specific (mindmap, state, etc.)
      nodeBkg: nodeFill,
      nodeBorder: t.accent,
      nodeTextColor: t.text,

      // — Edges & connections —
      lineColor: edgeColor,

      // — Cluster/subgraph borders —
      clusterBkg: t.bg,
      clusterBorder: t.accent,

      // — Edge label backgrounds —
      edgeLabelBackground: t.surface,

      // — Mindmap color scale (all depths use same fill for brand consistency) —
      cScale0: nodeFill,
      cScale1: nodeFill,
      cScale2: nodeFill,
      cScale3: nodeFill,
      cScale4: nodeFill,
      cScale5: nodeFill,
      cScale6: nodeFill,
      cScale7: nodeFill,
      cScale8: nodeFill,
      cScale9: nodeFill,
      cScale10: nodeFill,
      cScale11: nodeFill,

      // — Pie chart (branded slices) —
      pie1: t.accent,
      pie2: nodeFill,
      pie3: t.secondary,
      pie4: '#e89b7f', // terracotta light
      pie5: t.border,
      pie6: '#b85e3f', // terracotta dark

      // — Sequence diagram —
      actorBkg: nodeFill,
      actorBorder: t.accent,
      actorTextColor: t.text,
      actorLineColor: t.secondary,
      signalColor: t.text,
      signalTextColor: t.text,
      labelBoxBkgColor: nodeFill,
      labelBoxBorderColor: t.accent,
      labelTextColor: t.text,
      loopTextColor: t.text,
      noteBkgColor: t.surface,
      noteBorderColor: t.accent,
      noteTextColor: t.text,
      activationBkgColor: t.surface,
      activationBorderColor: t.accent,

      // — Timeline —
      cScaleLabel0: t.text,
      cScaleLabel1: t.text,
      cScaleLabel2: t.text,

      // — Typography —
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      fontSize: '14px',

      // — Background (container handles this via CSS) —
      background: 'transparent',
    },
  })
}

function MermaidBlock({ code }: { code: string }): React.JSX.Element {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    getMermaid()
      .then((mermaid) => {
        if (cancelled) return
        applyMermaidTheme(mermaid)
        const id = `mermaid-${++renderCounter}`
        return mermaid.render(id, code)
      })
      .then((result) => {
        if (cancelled || !result) return
        setSvg(result.svg)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [code])

  if (error) {
    return (
      <div data-mermaid-error="">
        <span className="text-xs text-[var(--secondary)] block mb-1">⚠ diagram syntax error</span>
        <pre className="bg-[var(--surface)] p-3 rounded-xl overflow-x-auto">
          <code>{code}</code>
        </pre>
      </div>
    )
  }

  if (svg) {
    return (
      <div
        data-mermaid=""
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  // Loading state — show raw code until render completes
  return (
    <pre className="bg-[var(--surface)] p-3 rounded-xl overflow-x-auto">
      <code>{code}</code>
    </pre>
  )
}

type CodeProps = ComponentPropsWithoutRef<'code'>

function CodeComponent({ className, children, ...props }: CodeProps): React.JSX.Element {
  const isMermaid = className?.includes('language-mermaid')
  const code = String(children).replace(/\n$/, '')

  if (isMermaid) {
    return <MermaidBlock code={code} />
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

const components = {
  code: CodeComponent,
}

export function RichMarkdown({ content }: RichMarkdownProps): React.JSX.Element {
  return (
    <Markdown remarkPlugins={[remarkGfm, remarkMark]} components={components}>
      {content}
    </Markdown>
  )
}
