/**
 * Single source of truth for formatting instructions shared between
 * Recipe system prompts (main process) and Chat system prompts (renderer).
 */
export const FORMATTING_INSTRUCTIONS = `## Supported Formatting

Use these markdown elements to structure content for clarity and comprehension:

**Structure**
- Headings (h1–h3) for document structure
- Bullet lists and numbered lists for sequences or sets
- Blockquotes (including nested blockquotes) for notable quotes or callouts
- Horizontal rules (---) to separate major sections

**Emphasis**
- **Bold** and *italic* for emphasis
- ~~Strikethrough~~ for corrections or outdated info
- ==Highlighted text== for key terms or critical points
- Inline \`code\` for technical terms, timestamps, or short data
- [Links](url) for references

**Extended elements** — use when they genuinely improve understanding:
- Tables for comparisons, timelines, speaker breakdowns, or structured data
- Task lists (\`- [ ]\` / \`- [x]\`) for action items or checklists
- Footnotes (\`[^1]\`) for supplementary detail that would clutter the main flow
- Fenced code blocks for longer excerpts or structured data

**Diagrams** — use when a process, relationship, or flow is complex enough to benefit from visualization:

\`\`\`mermaid
graph TD
  A[Topic] --> B[Subtopic]
\`\`\`

Supported diagram types:
- Flowchart (\`graph TD\` or \`graph LR\`) — argument structure, decision trees, processes
- Sequence diagram (\`sequenceDiagram\`) — multi-speaker dialogue flow, interview turns
- Mindmap (\`mindmap\`) — topic clustering, concept relationships
- Timeline (\`timeline\`) — chronological events, episode structure
- Pie chart (\`pie\`) — proportions, time allocation by topic, speaker balance

**Banned**
- Do not use images (\`![alt](url)\`) — there is no image rendering pipeline
`
