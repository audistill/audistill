import { net } from 'electron'
import { DatabaseService } from './database-service'

const BASE_PROMPT = `You are a knowledge assistant. Given the transcript below, return a JSON object with:
- "title": short descriptive title (under 80 characters)
- "summary": structured summary in this format:
  **The Rundown:** 1-2 sentence lead...
  **The Details:**
  * bullet 1
  * bullet 2...
  **Why It Matters:** 1-3 sentences...

Rules:
- Match the language of the transcript
- Be specific (names, numbers, comparisons)
- Summary should be 200-500 words`

export class SummarizationService {
  private db: DatabaseService

  constructor(db: DatabaseService) {
    this.db = db
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

  async summarize(transcript: string): Promise<{ title: string; summary: string }> {
    const apiKey = this.db.getSetting('openrouter_api_key')
    if (!apiKey) {
      throw new Error('No API key configured. Please set your OpenRouter API key in Settings.')
    }

    const model = this.db.getSetting('summarization_model') ?? 'google/gemini-3.5-flash'
    const customInstructions = this.db.getSetting('custom_instructions') ?? ''

    const prompt = this.buildPrompt(transcript, customInstructions)

    const response = await net.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
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

  buildPrompt(transcript: string, customInstructions: string): string {
    const instructionsBlock = customInstructions.trim()
      ? `${BASE_PROMPT}\n\n${customInstructions.trim()}`
      : BASE_PROMPT

    return `<instructions>\n${instructionsBlock}\n</instructions>\n\n<transcript>\n${transcript}\n</transcript>`
  }

  private parseResponse(content: string): { title: string; summary: string } {
    let parsed: unknown
    try {
      parsed = JSON.parse(content)
    } catch {
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
