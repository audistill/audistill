import { RichMarkdown } from './components/RichMarkdown'

interface PrintDocumentProps {
  tabName: string
  episodeTitle: string
  content: string
}

export function PrintDocument({
  tabName,
  episodeTitle,
  content,
}: PrintDocumentProps): React.JSX.Element {
  return (
    <main className="print-document">
      <header className="document-header">
        <h1>{tabName}</h1>
        <p>{episodeTitle}</p>
      </header>
      <article className="markdown-content">
        <RichMarkdown content={content} mermaidTheme="light" />
      </article>
    </main>
  )
}
