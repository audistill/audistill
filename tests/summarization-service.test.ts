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
      const messages = service.buildMessages('Test transcript', 'brief')
      expect(messages[0].content).toContain('concise overview summary')
      expect(messages[0].content).toContain('150-600 words')
      expect(messages[1].content).toContain('Test transcript')
    })

    it('loads the detailed template for viewType detailed', () => {
      const messages = service.buildMessages('Test transcript', 'detailed')
      expect(messages[0].content).toContain('structured reference summary')
      expect(messages[0].content).toContain('500-1500 words')
      expect(messages[1].content).toContain('Test transcript')
    })

    it('loads the full template for viewType full', () => {
      const messages = service.buildMessages('Test transcript', 'full')
      expect(messages[0].content).toContain('comprehensive chapter-style notes')
      expect(messages[0].content).toContain('2000-5000 words')
      expect(messages[1].content).toContain('Test transcript')
    })

    it('each template contains language-matching instructions', () => {
      for (const viewType of ['brief', 'detailed', 'full'] as const) {
        const messages = service.buildMessages('transcript', viewType)
        expect(messages[0].content).toContain('Match the language of the transcript')
      }
    })

    it('each template contains content-type examples', () => {
      for (const viewType of ['detailed', 'full'] as const) {
        const messages = service.buildMessages('transcript', viewType)
        expect(messages[0].content).toContain('meetings')
        expect(messages[0].content).toContain('podcast')
        expect(messages[0].content).toContain('lecture')
      }
    })
  })

  describe('message construction', () => {
    it('returns system and user messages with correct roles', () => {
      const messages = service.buildMessages('Hello world transcript', 'brief')

      expect(messages).toHaveLength(2)
      expect(messages[0].role).toBe('system')
      expect(messages[1].role).toBe('user')
    })

    it('system message contains template content', () => {
      const messages = service.buildMessages('Hello world transcript', 'brief')

      expect(messages[0].content).toContain('concise overview summary')
    })

    it('user message contains only transcript in XML tags', () => {
      const messages = service.buildMessages('Hello world transcript', 'brief')

      expect(messages[1].content).toBe('<transcript>\nHello world transcript\n</transcript>')
    })

    it('appends custom instructions to system message', () => {
      const messages = service.buildMessages('Transcript text', 'brief', 'Focus on technical details')

      expect(messages[0].content).toContain('Focus on technical details')
      expect(messages[0].content).toContain('Additional instructions:')
      expect(messages[0].content).toContain('concise overview summary')
      expect(messages[0].content.indexOf('concise overview summary')).toBeLessThan(
        messages[0].content.indexOf('Focus on technical details')
      )
    })

    it('custom instructions are appended for all view types', () => {
      for (const viewType of ['brief', 'detailed', 'full'] as const) {
        const messages = service.buildMessages('Transcript', viewType, 'Custom stuff')
        expect(messages[0].content).toContain('Custom stuff')
        expect(messages[0].content).toContain('Additional instructions:')
      }
    })

    it('no additional instructions block when custom instructions are empty', () => {
      const messages = service.buildMessages('Transcript', 'brief', '')
      expect(messages[0].content).not.toContain('Additional instructions:')
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
    it('sends system/user message pair in API request', async () => {
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
        expect(body.messages).toHaveLength(2)
        expect(body.messages[0].role).toBe('system')
        expect(body.messages[1].role).toBe('user')
        expect(body.messages[1].content).toContain('My transcript')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('sends brief template content in system message for brief viewType', async () => {
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
        const systemContent = body.messages[0].content
        expect(systemContent).toContain('150-600 words')
        expect(systemContent).not.toContain('500-1500 words')
        expect(systemContent).not.toContain('2000-5000 words')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('sends detailed template content in system message for detailed viewType', async () => {
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
        const systemContent = body.messages[0].content
        expect(systemContent).toContain('500-1500 words')
        expect(systemContent).not.toContain('150-400 words')
        expect(systemContent).not.toContain('2000-5000 words')
      } finally {
        globalThis.fetch = origFetch
      }
    })

    it('sends full template content in system message for full viewType', async () => {
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
        const systemContent = body.messages[0].content
        expect(systemContent).toContain('2000-5000 words')
        expect(systemContent).not.toContain('150-400 words')
        expect(systemContent).not.toContain('500-1500 words')
      } finally {
        globalThis.fetch = origFetch
      }
    })
  })
})
