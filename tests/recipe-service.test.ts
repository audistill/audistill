import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { join } from 'node:path'
import http from 'node:http'

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' },
  net: {
    fetch: (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)
  }
}))

import { DatabaseService } from '../src/main/database-service'
import { RecipeService } from '../src/main/recipe-service'

const PROMPTS_DIR = join(__dirname, '..', 'src', 'main', 'prompts')

describe('RecipeService', () => {
  let db: DatabaseService
  let service: RecipeService
  let server: http.Server
  let baseUrl: string
  let serverHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void

  beforeEach(async () => {
    db = new DatabaseService(':memory:')
    service = new RecipeService(db, PROMPTS_DIR)

    server = http.createServer((req, res) => serverHandler(req, res))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${addr.port}`

    db.setSetting('openrouter_api_key', 'test-key-123')
  })

  afterEach(async () => {
    db.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  describe('schema and seeding', () => {
    it('creates the recipes table on construction', () => {
      const recipes = service.getRecipes()
      expect(Array.isArray(recipes)).toBe(true)
    })

    it('seeds three built-in recipes on first run', () => {
      const recipes = service.getRecipes()
      expect(recipes).toHaveLength(3)
      expect(recipes.map((r) => r.name)).toEqual(['Brief', 'Detailed', 'Full'])
    })

    it('built-in recipes have is_builtin = 1', () => {
      const recipes = service.getRecipes()
      for (const r of recipes) {
        expect(r.is_builtin).toBe(1)
      }
    })

    it('built-in recipes contain prompt content from .txt files', () => {
      const recipes = service.getRecipes()
      const brief = recipes.find((r) => r.name === 'Brief')!
      expect(brief.prompt).toContain('concise overview summary')
      const detailed = recipes.find((r) => r.name === 'Detailed')!
      expect(detailed.prompt).toContain('structured reference summary')
      const full = recipes.find((r) => r.name === 'Full')!
      expect(full.prompt).toContain('comprehensive chapter-style notes')
    })

    it('does not re-seed if built-in recipes already exist', () => {
      const service2 = new RecipeService(db, PROMPTS_DIR)
      const recipes = service2.getRecipes()
      expect(recipes).toHaveLength(3)
    })

    it('sets pipeline_recipe_id to Brief recipe on first run', () => {
      const pipelineId = db.getSetting('pipeline_recipe_id')
      const brief = service.getRecipes().find((r) => r.name === 'Brief')!
      expect(pipelineId).toBe(brief.id)
    })
  })

  describe('CRUD operations', () => {
    it('getRecipe returns a single recipe by id', () => {
      const all = service.getRecipes()
      const recipe = service.getRecipe(all[0].id)
      expect(recipe).toBeDefined()
      expect(recipe!.name).toBe('Brief')
    })

    it('getRecipe returns undefined for non-existent id', () => {
      expect(service.getRecipe('nonexistent')).toBeUndefined()
    })

    it('createRecipe creates a custom recipe', () => {
      const id = service.createRecipe({
        name: 'Action Items',
        prompt: 'Extract action items from the transcript.'
      })
      expect(id).toBeDefined()
      const recipe = service.getRecipe(id)
      expect(recipe!.name).toBe('Action Items')
      expect(recipe!.prompt).toBe('Extract action items from the transcript.')
      expect(recipe!.is_builtin).toBe(0)
      expect(recipe!.model_override).toBeNull()
    })

    it('createRecipe with model_override', () => {
      const id = service.createRecipe({
        name: 'Quick Notes',
        prompt: 'Make quick notes.',
        model_override: 'google/gemini-flash'
      })
      const recipe = service.getRecipe(id)
      expect(recipe!.model_override).toBe('google/gemini-flash')
    })

    it('updateRecipe updates name and model_override', () => {
      const recipes = service.getRecipes()
      const brief = recipes.find((r) => r.name === 'Brief')!
      service.updateRecipe(brief.id, { name: 'Quick Brief', model_override: 'fast-model' })
      const updated = service.getRecipe(brief.id)
      expect(updated!.name).toBe('Quick Brief')
      expect(updated!.model_override).toBe('fast-model')
    })

    it('updateRecipe can update prompt', () => {
      const brief = service.getRecipes().find((r) => r.name === 'Brief')!
      service.updateRecipe(brief.id, { prompt: 'New prompt content' })
      const updated = service.getRecipe(brief.id)
      expect(updated!.prompt).toBe('New prompt content')
    })

    it('updateRecipe cannot change is_builtin flag', () => {
      const brief = service.getRecipes().find((r) => r.name === 'Brief')!
      service.updateRecipe(brief.id, { is_builtin: 0 } as any)
      const updated = service.getRecipe(brief.id)
      expect(updated!.is_builtin).toBe(1)
    })

    it('deleteRecipe removes a custom recipe', () => {
      const id = service.createRecipe({ name: 'Temp', prompt: 'temp' })
      expect(service.getRecipe(id)).toBeDefined()
      service.deleteRecipe(id)
      expect(service.getRecipe(id)).toBeUndefined()
    })

    it('deleteRecipe throws for built-in recipes', () => {
      const brief = service.getRecipes().find((r) => r.name === 'Brief')!
      expect(() => service.deleteRecipe(brief.id)).toThrow('Cannot delete built-in recipe')
    })

    it('getRecipes returns recipes ordered by sort_order', () => {
      service.createRecipe({ name: 'Z Recipe', prompt: 'z' })
      service.createRecipe({ name: 'A Recipe', prompt: 'a' })
      const recipes = service.getRecipes()
      expect(recipes[0].name).toBe('Brief')
      expect(recipes[1].name).toBe('Detailed')
      expect(recipes[2].name).toBe('Full')
    })
  })

  describe('getPipelineRecipe', () => {
    it('returns the recipe designated in settings', () => {
      const pipeline = service.getPipelineRecipe()
      expect(pipeline).toBeDefined()
      expect(pipeline!.name).toBe('Brief')
    })

    it('returns the Brief recipe if setting is missing', () => {
      db.setSetting('pipeline_recipe_id', '')
      const pipeline = service.getPipelineRecipe()
      expect(pipeline).toBeDefined()
      expect(pipeline!.name).toBe('Brief')
    })

    it('returns a different recipe when pipeline setting is changed', () => {
      const detailed = service.getRecipes().find((r) => r.name === 'Detailed')!
      db.setSetting('pipeline_recipe_id', detailed.id)
      const pipeline = service.getPipelineRecipe()
      expect(pipeline!.name).toBe('Detailed')
    })
  })

  describe('executeRecipe', () => {
    it('streams tokens via onToken callback', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
        res.write('data: {"choices":[{"delta":{"content":" world"}}]}\n\n')
        res.write('data: [DONE]\n\n')
        res.end()
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        const tokens: string[] = []
        await service.executeRecipe(
          service.getRecipes()[0].id,
          'Test transcript',
          (token) => tokens.push(token)
        )
        expect(tokens).toEqual(['Hello', ' world'])
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('throws if no API key is configured', async () => {
      const dbNoKey = new DatabaseService(':memory:')
      const svcNoKey = new RecipeService(dbNoKey, PROMPTS_DIR)

      await expect(
        svcNoKey.executeRecipe(svcNoKey.getRecipes()[0].id, 'Transcript', () => {})
      ).rejects.toThrow('No API key')

      dbNoKey.close()
    })

    it('throws for non-existent recipe id', async () => {
      await expect(
        service.executeRecipe('bad-id', 'Transcript', () => {})
      ).rejects.toThrow('Recipe not found')
    })

    it('uses recipe model_override when set', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n')
          res.write('data: [DONE]\n\n')
          res.end()
        })
      }

      const id = service.createRecipe({
        name: 'Custom',
        prompt: 'Do something.',
        model_override: 'custom/model-xyz'
      })

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        await service.executeRecipe(id, 'Transcript', () => {})
        const body = JSON.parse(receivedBody)
        expect(body.model).toBe('custom/model-xyz')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('uses global default model when recipe has no override', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n')
          res.write('data: [DONE]\n\n')
          res.end()
        })
      }

      db.setSetting('model_quality', 'google/gemini-pro')

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        const brief = service.getRecipes().find((r) => r.name === 'Brief')!
        await service.executeRecipe(brief.id, 'Transcript', () => {})
        const body = JSON.parse(receivedBody)
        expect(body.model).toBe('google/gemini-pro')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('builds correct messages with recipe prompt as system and transcript as user', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write('data: {"choices":[{"delta":{"content":"ok"}}]}\n\n')
          res.write('data: [DONE]\n\n')
          res.end()
        })
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        const brief = service.getRecipes().find((r) => r.name === 'Brief')!
        await service.executeRecipe(brief.id, 'My test transcript', () => {})
        const body = JSON.parse(receivedBody)
        expect(body.messages).toHaveLength(2)
        expect(body.messages[0].role).toBe('system')
        expect(body.messages[0].content).toContain('concise overview summary')
        expect(body.messages[1].role).toBe('user')
        expect(body.messages[1].content).toContain('My test transcript')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('enables streaming in the API request', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write('data: {"choices":[{"delta":{"content":"x"}}]}\n\n')
          res.write('data: [DONE]\n\n')
          res.end()
        })
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        const brief = service.getRecipes().find((r) => r.name === 'Brief')!
        await service.executeRecipe(brief.id, 'Transcript', () => {})
        const body = JSON.parse(receivedBody)
        expect(body.stream).toBe(true)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('throws on API error response', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'internal server error' }))
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        const brief = service.getRecipes().find((r) => r.name === 'Brief')!
        await expect(
          service.executeRecipe(brief.id, 'Transcript', () => {})
        ).rejects.toThrow('OpenRouter API error')
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })
})
