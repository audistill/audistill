export const SUPPORTED_MARKDOWN_ELEMENTS = [
  'Headings (h1-h3)',
  'Bold and italic',
  'Bullet lists and numbered lists',
  'Blockquotes',
  'Links',
  'Inline code',
  'Code blocks (fenced with ```)',
  'Horizontal rules (---)',
] as const

export const MARKDOWN_FORMAT_GUIDANCE = `
## Formatting Guidelines
Use only these markdown elements in your output:
- Headings (h1-h3) for structure
- **Bold** and *italic* for emphasis
- Bullet lists and numbered lists
- Blockquotes for notable quotes or callouts
- [Links](url) for references
- Inline \`code\` for technical terms or timestamps
- Fenced code blocks for longer excerpts or structured data
- Horizontal rules (---) to separate major sections

Do not use tables, images, task lists, or nested blockquotes.`
