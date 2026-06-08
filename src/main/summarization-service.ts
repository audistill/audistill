import { net } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseService } from './database-service'
import { MARKDOWN_FORMAT_GUIDANCE } from '../shared/markdown-guidance'

export type ViewType = 'brief' | 'detailed' | 'full'

const PROMPTS_DIR = join(__dirname, '..', '..', 'src', 'main', 'prompts')

export class SummarizationService {
  private db: DatabaseService
  private prompts: Record<ViewType, string>

  constructor(db: DatabaseService, promptsDir?: string) {
    this.db = db
    const dir = promptsDir ?? PROMPTS_DIR
    this.prompts = {
      brief: readFileSync(join(dir, 'brief.txt'), 'utf-8'),
      detailed: readFileSync(join(dir, 'detailed.txt'), 'utf-8'),
      full: readFileSync(join(dir, 'full.txt'), 'utf-8'),
    }
  }

  async validateApiKey(key: string): Promise<boolean> {
    try {
      const response = await net.fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${key}`,
        },
      })
      return response.status === 200
    } catch {
      return false
    }
  }

  async summarize(
    transcript: string,
    viewType: ViewType
  ): Promise<{ title: string; summary: string }> {
    const apiKey = this.db.getSetting('openrouter_api_key')
    if (!apiKey) {
      throw new Error('No API key configured. Please set your OpenRouter API key in Settings.')
    }

    const model = this.resolveModel(viewType)
    const customInstructions = this.db.getSetting('custom_instructions') ?? ''

    const messages = this.buildMessages(transcript, viewType, customInstructions)

    const response = await net.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        response_format: { type: 'json_object' },
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${text}`)
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[]
    }

    const content = data.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from OpenRouter API')
    }

    return this.parseResponse(content)
  }

  resolveModel(viewType: ViewType): string {
    if (viewType === 'brief') {
      return this.db.getSetting('model_fast') ?? 'google/gemini-3.1-flash-lite'
    }
    return this.db.getSetting('model_quality') ?? 'google/gemini-3.5-flash'
  }

  buildMessages(
    transcript: string,
    viewType: ViewType,
    customInstructions?: string
  ): { role: 'system' | 'user'; content: string }[] {
    const template = this.prompts[viewType]
    let systemContent = `${template}\n${MARKDOWN_FORMAT_GUIDANCE}`
    if (customInstructions?.trim()) {
      systemContent += `\n\nAdditional instructions:\n${customInstructions.trim()}`
    }

    return [
      { role: 'system', content: systemContent },
      { role: 'user', content: `<transcript>\n${transcript}\n</transcript>` },
    ]
  }

  private extractJson(content: string): string {
    const trimmed = content.trim()
    const fenceMatch = trimmed.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```$/)
    if (fenceMatch) return fenceMatch[1].trim()
    return trimmed
  }

  private parseResponse(content: string): { title: string; summary: string } {
    let parsed: unknown
    try {
      parsed = JSON.parse(this.extractJson(content))
    } catch (e) {
      console.error('[summarization] Failed to parse LLM response as JSON')
      console.error('[summarization] Raw response:', content)
      console.error('[summarization] Parse error:', e)
      throw new Error('Failed to parse LLM response as JSON')
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('title' in parsed) ||
      !('summary' in parsed)
    ) {
      throw new Error('LLM response missing required fields (title, summary)')
    }

    const { title, summary } = parsed as { title: unknown; summary: unknown }
    if (typeof title !== 'string' || typeof summary !== 'string') {
      throw new Error('LLM response fields must be strings')
    }

    return { title, summary }
  }
}
