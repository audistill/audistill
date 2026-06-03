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
import { SummarizationService } from '../src/main/summarization-service'

const PROMPTS_DIR = join(__dirname, '..', 'src', 'main', 'prompts')

describe('SummarizationService', () => {
  let db: DatabaseService
  let service: SummarizationService
  let server: http.Server
  let baseUrl: string

  let serverHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void

  beforeEach(async () => {
    db = new DatabaseService(':memory:')
    service = new SummarizationService(db, PROMPTS_DIR)

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

  describe('prompt template loading', () => {
    it('loads the brief template for viewType brief', () => {
      const prompt = service.buildPrompt('Test transcript', 'brief')
      expect(prompt).toContain('concise overview summary')
      expect(prompt).toContain('150-400 words')
      expect(prompt).toContain('Test transcript')
    })

    it('loads the detailed template for viewType detailed', () => {
      const prompt = service.buildPrompt('Test transcript', 'detailed')
      expect(prompt).toContain('structured reference summary')
      expect(prompt).toContain('500-1500 words')
      expect(prompt).toContain('Test transcript')
    })

    it('loads the full template for viewType full', () => {
      const prompt = service.buildPrompt('Test transcript', 'full')
      expect(prompt).toContain('comprehensive chapter-style notes')
      expect(prompt).toContain('2000-5000 words')
      expect(prompt).toContain('Test transcript')
    })

    it('each template contains language-matching instructions', () => {
      for (const viewType of ['brief', 'detailed', 'full'] as const) {
        const prompt = service.buildPrompt('transcript', viewType)
        expect(prompt).toContain('Match the language of the transcript')
      }
    })

    it('each template contains content-type examples', () => {
      for (const viewType of ['brief', 'detailed', 'full'] as const) {
        const prompt = service.buildPrompt('transcript', viewType)
        expect(prompt).toContain('meetings')
        expect(prompt).toContain('podcast')
        expect(prompt).toContain('lecture')
      }
    })
  })

  describe('prompt construction', () => {
    it('assembles template + transcript in XML format', () => {
      const prompt = service.buildPrompt('Hello world transcript', 'brief')

      expect(prompt).toContain('<instructions>')
      expect(prompt).toContain('</instructions>')
      expect(prompt).toContain('<transcript>')
      expect(prompt).toContain('Hello world transcript')
      expect(prompt).toContain('</transcript>')
    })

    it('appends custom instructions to template', () => {
      const prompt = service.buildPrompt('Transcript text', 'brief', 'Focus on technical details')

      expect(prompt).toContain('Focus on technical details')
      expect(prompt).toContain('Additional instructions:')
      expect(prompt).toContain('concise overview summary')
      expect(prompt.indexOf('concise overview summary')).toBeLessThan(
        prompt.indexOf('Focus on technical details')
      )
    })

    it('custom instructions are appended for all view types', () => {
      for (const viewType of ['brief', 'detailed', 'full'] as const) {
        const prompt = service.buildPrompt('Transcript', viewType, 'Custom stuff')
        expect(prompt).toContain('Custom stuff')
        expect(prompt).toContain('Additional instructions:')
      }
    })

    it('no additional instructions block when custom instructions are empty', () => {
      const prompt = service.buildPrompt('Transcript', 'brief', '')
      expect(prompt).not.toContain('Additional instructions:')
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
                summary: 'A concise overview of the content.'
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
        const result = await service.summarize('Test transcript', 'brief')
        expect(result.title).toBe('Great Episode')
        expect(result.summary).toContain('concise overview')
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
        await expect(service.summarize('Test transcript', 'brief')).rejects.toThrow('parse')
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
        await expect(service.summarize('Test transcript', 'detailed')).rejects.toThrow('missing required fields')
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
      const svcNoKey = new SummarizationService(dbNoKey, PROMPTS_DIR)

      await expect(svcNoKey.summarize('Transcript', 'brief')).rejects.toThrow('No API key')
      dbNoKey.close()
    })
  })

  describe('correct template selection per view type', () => {
    it('sends brief template content in API request for brief viewType', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ title: 'T', summary: 'S' }) } }]
          }))
        })
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        await service.summarize('My transcript', 'brief')
        const body = JSON.parse(receivedBody)
        const content = body.messages[0].content
        expect(content).toContain('150-400 words')
        expect(content).not.toContain('500-1500 words')
        expect(content).not.toContain('2000-5000 words')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('sends detailed template content in API request for detailed viewType', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ title: 'T', summary: 'S' }) } }]
          }))
        })
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        await service.summarize('My transcript', 'detailed')
        const body = JSON.parse(receivedBody)
        const content = body.messages[0].content
        expect(content).toContain('500-1500 words')
        expect(content).not.toContain('150-400 words')
        expect(content).not.toContain('2000-5000 words')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('sends full template content in API request for full viewType', async () => {
      let receivedBody = ''
      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => { data += chunk })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({
            choices: [{ message: { content: JSON.stringify({ title: 'T', summary: 'S' }) } }]
          }))
        })
      }

      const origFetch = globalThis.fetch
      globalThis.fetch = (input, init) => {
        const url = typeof input === 'string' ? input : (input as Request).url
        const rewritten = url.replace('https://openrouter.ai/api/v1/chat/completions', `${baseUrl}/chat`)
        return origFetch(rewritten, init)
      }

      try {
        await service.summarize('My transcript', 'full')
        const body = JSON.parse(receivedBody)
        const content = body.messages[0].content
        expect(content).toContain('2000-5000 words')
        expect(content).not.toContain('150-400 words')
        expect(content).not.toContain('500-1500 words')
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })
})
