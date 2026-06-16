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
let mermaidInitialized = false
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

function initMermaidTheme(mermaid: typeof import('mermaid')['default']): void {
  if (mermaidInitialized) return
  mermaidInitialized = true

  const root = document.documentElement
  const style = getComputedStyle(root)
  const surface = style.getPropertyValue('--surface').trim() || '#1e1e1c'
  const text = style.getPropertyValue('--text').trim() || '#faf9f5'
  const accent = style.getPropertyValue('--accent').trim() || '#d97757'

  mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
      // Primary palette
      primaryColor: surface,
      primaryTextColor: text,
      primaryBorderColor: accent,
      secondaryColor: surface,
      secondaryTextColor: text,
      secondaryBorderColor: accent,
      tertiaryColor: surface,
      tertiaryTextColor: text,
      tertiaryBorderColor: accent,
      // Node-specific (used by mindmap and others)
      nodeBkg: surface,
      nodeBorder: accent,
      nodeTextColor: text,
      // Edges and lines
      lineColor: accent,
      // Cluster/group borders
      clusterBorder: accent,
      // Mindmap color scales (depth levels)
      cScale0: surface,
      cScale1: surface,
      cScale2: surface,
      cScale3: surface,
      cScale4: surface,
      cScale5: surface,
      cScale6: surface,
      cScale7: surface,
      cScale8: surface,
      cScale9: surface,
      cScale10: surface,
      cScale11: surface,
      // General
      fontFamily: '-apple-system, BlinkMacSystemFont, system-ui, sans-serif',
      fontSize: '14px',
      // Background
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
        initMermaidTheme(mermaid)
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
        <pre className="bg-[var(--surface)] p-3 rounded-md overflow-x-auto">
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
        className="overflow-x-auto my-3"
        dangerouslySetInnerHTML={{ __html: svg }}
      />
    )
  }

  // Loading state — show raw code until render completes
  return (
    <pre className="bg-[var(--surface)] p-3 rounded-md overflow-x-auto">
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
