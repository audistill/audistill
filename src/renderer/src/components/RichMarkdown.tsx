import {
  Children,
  isValidElement,
  useState,
  useEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkMark } from 'remark-mark-highlight'

interface RichMarkdownProps {
  content: string
  streaming?: boolean
  mermaidTheme?: 'auto' | 'light'
}

let mermaidPromise: Promise<typeof import('mermaid')['default']> | null = null
let mermaidInstance: typeof import('mermaid')['default'] | null = null
let lastThemeSignature: string | null = null
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
function applyMermaidTheme(
  mermaid: typeof import('mermaid')['default'],
  requestedTheme: 'auto' | 'light'
): void {
  const isDark = requestedTheme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches
  const mode = isDark ? 'dark' : 'light'

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
  const t = requestedTheme === 'light'
    ? {
        bg: '#ffffff',
        surface: '#f3f1eb',
        border: '#d8d4ca',
        text: '#1c1b19',
        secondary: '#6f6c65',
        accent: '#b95637',
      }
    : {
        bg: bg || (isDark ? '#141413' : '#faf9f5'),
        surface: surface || (isDark ? '#1e1e1c' : '#e8e6dc'),
        border: border || (isDark ? '#2a2a28' : '#d4d2c8'),
        text: text || (isDark ? '#faf9f5' : '#141413'),
        secondary: secondary || (isDark ? '#c2c0b8' : '#7a7870'),
        accent: accent || '#d97757',
      }

  const themeSignature = JSON.stringify({ mode, ...t })
  if (lastThemeSignature === themeSignature) return
  lastThemeSignature = themeSignature

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

      // — Error handling —
      // Suppress Mermaid's built-in error SVG rendering (injects into document.body)
      // so our own React error fallback handles it cleanly.
      suppressErrorRendering: true,
    },
  })
}

function MermaidBlock({ code, theme }: { code: string; theme: 'auto' | 'light' }): React.JSX.Element {
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false

    const currentId = `mermaid-${++renderCounter}`

    getMermaid()
      .then((mermaid) => {
        if (cancelled) return
        applyMermaidTheme(mermaid, theme)
        return mermaid.render(currentId, code)
      })
      .then((result) => {
        if (cancelled || !result) return
        setSvg(result.svg)
      })
      .catch((error: unknown) => {
        console.error('Mermaid rendering failed', error)
        // Defensive cleanup: remove any orphaned temp element Mermaid
        // may have injected into the DOM before throwing
        document.getElementById(`d${currentId}`)?.remove()
        if (!cancelled) setError(true)
      })

    return () => {
      cancelled = true
    }
  }, [code, theme])

  if (error) {
    return (
      <div data-mermaid-error="" data-mermaid-state="fallback">
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
        data-mermaid-state="rendered"
        ref={containerRef}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  // Loading state — show raw code until render completes
  return (
    <div data-mermaid-state="pending">
      <pre className="bg-[var(--surface)] p-3 rounded-xl overflow-x-auto">
        <code>{code}</code>
      </pre>
    </div>
  )
}

type AnchorProps = ComponentPropsWithoutRef<'a'>

function AnchorComponent({ href, children, ...props }: AnchorProps): React.JSX.Element {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    e.preventDefault()
    if (href) {
      window.electron.ipcRenderer.invoke('shell:open-external', href)
    }
  }

  return (
    <a href={href} onClick={handleClick} {...props}>
      {children}
    </a>
  )
}

type CodeProps = ComponentPropsWithoutRef<'code'>

function CodeComponent({ className, children, ...props }: CodeProps): React.JSX.Element {
  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

type PreProps = ComponentPropsWithoutRef<'pre'> & { children?: ReactNode }

function PreComponent({
  children,
  mermaidTheme,
  ...props
}: PreProps & { mermaidTheme: 'auto' | 'light' }): React.JSX.Element {
  const child = Children.toArray(children)[0]
  if (Children.count(children) === 1 && isValidElement(child)) {
    const childProps = child.props as { className?: string; children?: ReactNode }
    if (childProps.className?.includes('language-mermaid')) {
      const code = String(childProps.children).replace(/\n$/, '')
      return <MermaidBlock code={code} theme={mermaidTheme} />
    }
  }
  return <pre {...props}>{children}</pre>
}

export function RichMarkdown({
  content,
  mermaidTheme = 'auto',
}: RichMarkdownProps): React.JSX.Element {
  return (
    <Markdown
      remarkPlugins={[remarkGfm, remarkMark]}
      components={{
        code: CodeComponent,
        a: AnchorComponent,
        pre: (props) => <PreComponent {...props} mermaidTheme={mermaidTheme} />,
      }}
    >
      {content}
    </Markdown>
  )
}
