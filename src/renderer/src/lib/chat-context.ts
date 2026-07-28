import { FORMATTING_INSTRUCTIONS } from '../../../shared/formatting-instructions'

interface TabContextItem {
  id: string
  tab_name: string
  content: string
}

export interface ChatPromptContext {
  episodeTitle: string
  fileName: string
  duration: string | null
  date: string
  activeTabName: string | null
  activeTabContent: string | null
  tabsContext: string | null
}

export function buildTabsContext(tabs: TabContextItem[], activeTabId: string | null): string {
  return tabs.map((tab) => {
    const active = tab.id === activeTabId
    const contentState = tab.content ? `${tab.content.length.toLocaleString()} chars` : 'empty'
    return `- ${tab.tab_name} (${active ? 'active, ' : ''}${contentState})`
  }).join('\n')
}

export function buildSystemPrompt(context: ChatPromptContext): string {
  let prompt = `You are a helpful AI assistant for the Audistill podcast app. You help users understand, explore, and create content from their podcast episodes.

## Current Episode
- Title: ${context.episodeTitle}
- File: ${context.fileName}
${context.duration ? `- Duration: ${context.duration}` : ''}
- Date: ${context.date}
`

  if (context.tabsContext) {
    prompt += `
## Tabs
${context.tabsContext}
`
  }

  if (context.activeTabName && context.activeTabContent) {
    prompt += `
## Active Tab: ${context.activeTabName}
${context.activeTabContent}
`
  }

  prompt += `
## Available Tools
You have access to tools for reading transcripts, searching content, accessing episode data, and writing to tabs.

When answering questions about the episode content, prefer using the search_transcript tool to find relevant segments rather than relying only on the active tab.

To read the full content of a non-active tab listed above, use the read_summary tool with the tab_name parameter.

When the user asks you to write, draft, or create something categorically new (show notes, blog posts, key takeaways, etc.), use write_tab with a new tab_name. When they ask to rewrite the current content or make a targeted edit ("make this shorter", "change X to Y", "update the third bullet"), omit tab_name so write_tab or edit_tab targets the active tab. Use navigate_tab to switch between tabs.

Be concise and helpful. Format responses with markdown when appropriate.

${FORMATTING_INSTRUCTIONS}`

  return prompt
}
