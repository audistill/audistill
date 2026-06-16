import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { remarkMark } from 'remark-mark-highlight'

interface RichMarkdownProps {
  content: string
  streaming?: boolean
}

export function RichMarkdown({ content }: RichMarkdownProps): React.JSX.Element {
  return <Markdown remarkPlugins={[remarkGfm, remarkMark]}>{content}</Markdown>
}
