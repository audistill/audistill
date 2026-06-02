import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import http from 'node:http'

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' },
  net: {
    fetch: (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)
  }
}))

import { DatabaseService } from '../src/main/database-service'
import { SummarizationService } from '../src/main/summarization-service'

describe('SummarizationService', () => {
  let db: DatabaseService
  let service: SummarizationService
  let server: http.Server
  let baseUrl: string

  let serverHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void

  beforeEach(async () => {
    db = new DatabaseService(':memory:')
    service = new SummarizationService(db)

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

  describe('prompt construction', () => {
    it('assembles base instructions + transcript in XML format', () => {
      const prompt = service.buildPrompt('Hello world transcript', '')

      expect(prompt).toContain('<instructions>')
      expect(prompt).toContain('</instructions>')
      expect(prompt).toContain('<transcript>')
      expect(prompt).toContain('Hello world transcript')
      expect(prompt).toContain('</transcript>')
      expect(prompt).toContain('knowledge assistant')
    })

    it('appends custom instructions to base prompt', () => {
      const prompt = service.buildPrompt('Transcript text', 'Focus on technical details')

      expect(prompt).toContain('Focus on technical details')
      expect(prompt).toContain('knowledge assistant')
      expect(prompt.indexOf('knowledge assistant')).toBeLessThan(
        prompt.indexOf('Focus on technical details')
      )
    })

    it('custom instructions do not replace base prompt', () => {
      const prompt = service.buildPrompt('Transcript', 'Custom stuff')

      expect(prompt).toContain('knowledge assistant')
      expect(prompt).toContain('Custom stuff')
      expect(prompt).toContain('Transcript')
    })
  })

  describe('response parsing', () => {
    it('extracts title and summary from valid JSON response', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          choices: [{
            message: {
              content: JSON.stringify({
                title: 'Great Episode',
                summary: '**The Rundown:** Something happened.'
              })
            }
          }]
        }))
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        const result = await service.summarize('Test transcript')
        expect(result.title).toBe('Great Episode')
        expect(result.summary).toContain('The Rundown')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('throws on malformed JSON response', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          choices: [{ message: { content: 'not valid json {{{' } }]
        }))
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        await expect(service.summarize('Test transcript')).rejects.toThrow('parse')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('throws when response is missing required fields', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({
          choices: [{ message: { content: JSON.stringify({ title: 'Only title' }) } }]
        }))
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        await expect(service.summarize('Test transcript')).rejects.toThrow('missing required fields')
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })

  describe('validateApiKey', () => {
    it('returns true for valid key (200 response)', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data: [] }))
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/models', `${baseUrl}/models`)
        return origFetch(rewritten, init)
      }

      try {
        const result = await service.validateApiKey('valid-key')
        expect(result).toBe(true)
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('returns false for invalid key (401 response)', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(401, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'unauthorized' }))
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/models', `${baseUrl}/models`)
        return origFetch(rewritten, init)
      }

      try {
        const result = await service.validateApiKey('bad-key')
        expect(result).toBe(false)
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })

  describe('error handling', () => {
    it('throws when no API key is configured', async () => {
      db.setSetting('openrouter_api_key', '')
      const dbNoKey = new DatabaseService(':memory:')
      const svcNoKey = new SummarizationService(dbNoKey)

      await expect(svcNoKey.summarize('Transcript')).rejects.toThrow('No API key')
      dbNoKey.close()
    })
  })
})
