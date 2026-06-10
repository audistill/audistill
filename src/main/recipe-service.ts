import { net } from 'electron'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { randomUUID } from 'crypto'
import { DatabaseService } from './database-service'

export interface Recipe {
  id: string
  name: string
  prompt: string
  model_override: string | null
  is_builtin: number
  sort_order: number
  created_at: string
}

const PROMPTS_DIR = join(__dirname, '..', '..', 'src', 'main', 'prompts')

const RECIPE_SYSTEM_FRAME = `You are a knowledge assistant that summarises audio transcripts.

<output-format>
Your response MUST use this exact structure:

TITLE: <short descriptive title, under 80 characters>
---
<markdown body>

The first line is the title. The separator (---) marks where the body begins.
Do not wrap output in JSON, code fences, or any other container.
</output-format>

<markdown-rules>
Use only these markdown elements:
- Headings (h2-h3) for structure
- **Bold** and *italic* for emphasis
- Bullet lists and numbered lists
- Blockquotes for notable quotes
- Inline \`code\` for technical terms
- Horizontal rules (---) to separate major sections

Do not use tables, images, task lists, or nested blockquotes.
</markdown-rules>`

const BUILTIN_RECIPES = [
  { name: 'Brief', file: 'brief.txt', sort_order: 0 },
  { name: 'Detailed', file: 'detailed.txt', sort_order: 1 },
  { name: 'Full', file: 'full.txt', sort_order: 2 }
]

export class RecipeService {
  private db: DatabaseService

  constructor(db: DatabaseService, promptsDir?: string) {
    this.db = db
    this.initSchema()
    this.seedBuiltins(promptsDir ?? PROMPTS_DIR)
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        prompt TEXT NOT NULL,
        model_override TEXT,
        is_builtin INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `)
  }

  private seedBuiltins(promptsDir: string): void {
    const existing = this.db.queryAll<{ id: string }>(
      'SELECT id FROM recipes WHERE is_builtin = 1'
    )
    if (existing.length > 0) return

    let firstId: string | null = null
    for (const builtin of BUILTIN_RECIPES) {
      const id = randomUUID()
      if (!firstId) firstId = id
      const prompt = readFileSync(join(promptsDir, builtin.file), 'utf-8')
      this.db.run(
        `INSERT INTO recipes (id, name, prompt, is_builtin, sort_order) VALUES (?, ?, ?, 1, ?)`,
        id, builtin.name, prompt, builtin.sort_order
      )
    }

    if (firstId && !this.db.getSetting('pipeline_recipe_id')) {
      this.db.setSetting('pipeline_recipe_id', firstId)
    }
  }

  getRecipes(): Recipe[] {
    return this.db.queryAll<Recipe>('SELECT * FROM recipes ORDER BY sort_order, created_at')
  }

  getRecipe(id: string): Recipe | undefined {
    return this.db.queryOne<Recipe>('SELECT * FROM recipes WHERE id = ?', id)
  }

  createRecipe(data: { name: string; prompt: string; model_override?: string }): string {
    const id = randomUUID()
    const maxOrder = this.db.queryOne<{ max_order: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) as max_order FROM recipes'
    )
    const sortOrder = (maxOrder?.max_order ?? -1) + 1
    this.db.run(
      `INSERT INTO recipes (id, name, prompt, model_override, is_builtin, sort_order) VALUES (?, ?, ?, ?, 0, ?)`,
      id, data.name, data.prompt, data.model_override ?? null, sortOrder
    )
    return id
  }

  updateRecipe(id: string, fields: Partial<Pick<Recipe, 'name' | 'prompt' | 'model_override'>>): void {
    const allowed = ['name', 'prompt', 'model_override']
    const entries = Object.entries(fields).filter(([key]) => allowed.includes(key))
    if (entries.length === 0) return

    const sets = entries.map(([key]) => `${key} = ?`).join(', ')
    const values = entries.map(([, val]) => val ?? null)
    this.db.run(`UPDATE recipes SET ${sets} WHERE id = ?`, ...values, id)
  }

  deleteRecipe(id: string): void {
    const recipe = this.getRecipe(id)
    if (!recipe) return
    if (recipe.is_builtin) {
      throw new Error('Cannot delete built-in recipe')
    }
    this.db.run('DELETE FROM recipes WHERE id = ?', id)
  }

  getPipelineRecipe(): Recipe | undefined {
    const pipelineId = this.db.getSetting('pipeline_recipe_id')
    if (pipelineId) {
      const recipe = this.getRecipe(pipelineId)
      if (recipe) return recipe
    }
    return this.db.queryOne<Recipe>(
      "SELECT * FROM recipes WHERE is_builtin = 1 ORDER BY sort_order LIMIT 1"
    )
  }

  async executeRecipe(
    recipeId: string,
    transcript: string,
    onToken: (token: string) => void
  ): Promise<void> {
    const recipe = this.getRecipe(recipeId)
    if (!recipe) throw new Error('Recipe not found')

    const apiKey = this.db.getSetting('openrouter_api_key')
    if (!apiKey) {
      throw new Error('No API key configured. Please set your OpenRouter API key in Settings.')
    }

    const model = recipe.model_override ?? this.db.getSetting('model_quality') ?? 'google/gemini-3.5-flash'
    const customInstructions = this.db.getSetting('custom_instructions') ?? ''

    let templateMessage = `<template>\n${recipe.prompt}\n</template>`
    if (customInstructions.trim()) {
      templateMessage = `<instructions>\n${customInstructions.trim()}\n</instructions>\n\n${templateMessage}`
    }

    const messages = [
      { role: 'system', content: RECIPE_SYSTEM_FRAME },
      { role: 'user', content: templateMessage },
      { role: 'user', content: `<transcript>\n${transcript}\n</transcript>` }
    ]

    const response = await net.fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: true
      })
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`OpenRouter API error (${response.status}): ${text}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const data = line.slice(6).trim()
        if (data === '[DONE]') return
        try {
          const parsed = JSON.parse(data)
          const content = parsed.choices?.[0]?.delta?.content
          if (content) onToken(content)
        } catch {
          // skip malformed SSE lines
        }
      }
    }
  }
}
