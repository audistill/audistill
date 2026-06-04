import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import http from 'node:http'

const broadcasts: { channel: string; args: unknown[] }[] = []

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' },
  net: {
    fetch: (...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args),
  },
  BrowserWindow: {
    getAllWindows: () => [
      {
        isDestroyed: () => false,
        webContents: {
          send: (channel: string, ...args: unknown[]) => {
            broadcasts.push({ channel, args })
          },
        },
      },
    ],
  },
}))

import { DatabaseService } from '../src/main/database-service'
import { ChatService, ChatRequest, ToolExecutor } from '../src/main/chat-service'

function sseChunk(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

function sseDone(): string {
  return 'data: [DONE]\n\n'
}

function makeTextDelta(content: string): unknown {
  return {
    choices: [{ delta: { content } }],
  }
}

function makeToolCallDelta(index: number, id: string, name: string, args: string): unknown {
  return {
    choices: [
      {
        delta: {
          tool_calls: [{ index, id, function: { name, arguments: args } }],
        },
      },
    ],
  }
}

function makeToolCallArgsDelta(index: number, args: string): unknown {
  return {
    choices: [
      {
        delta: {
          tool_calls: [{ index, function: { arguments: args } }],
        },
      },
    ],
  }
}

describe('ChatService', () => {
  let db: DatabaseService
  let service: ChatService
  let server: http.Server
  let baseUrl: string
  let serverHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void
  let origFetch: typeof globalThis.fetch

  beforeEach(async () => {
    broadcasts.length = 0
    db = new DatabaseService(':memory:')
    service = new ChatService(db)

    server = http.createServer((req, res) => serverHandler(req, res))
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
    const addr = server.address() as { port: number }
    baseUrl = `http://127.0.0.1:${addr.port}`

    db.setSetting('openrouter_api_key', 'test-key-123')

    origFetch = globalThis.fetch
    globalThis.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      const rewritten = url.replace(
        'https://openrouter.ai/api/v1/chat/completions',
        `${baseUrl}/chat`
      )
      return origFetch(rewritten, init)
    }
  })

  afterEach(async () => {
    globalThis.fetch = origFetch
    db.close()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  })

  function makeRequest(overrides?: Partial<ChatRequest>): ChatRequest {
    return {
      model: 'test/model',
      systemPrompt: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'Hello' }],
      tools: [],
      ...overrides,
    }
  }

  describe('request formation', () => {
    it('sends correct headers and body to OpenRouter', async () => {
      let receivedHeaders: http.IncomingHttpHeaders = {}
      let receivedBody = ''

      serverHandler = (req, res) => {
        receivedHeaders = req.headers
        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write(sseChunk(makeTextDelta('Hi')))
          res.write(sseDone())
          res.end()
        })
      }

      await service.sendMessage(makeRequest())

      expect(receivedHeaders['authorization']).toBe('Bearer test-key-123')
      expect(receivedHeaders['content-type']).toBe('application/json')
      expect(receivedHeaders['http-referer']).toBe('https://audistill.app')

      const body = JSON.parse(receivedBody)
      expect(body.model).toBe('test/model')
      expect(body.stream).toBe(true)
      expect(body.messages[0]).toEqual({ role: 'system', content: 'You are a helpful assistant.' })
      expect(body.messages[1]).toEqual({ role: 'user', content: 'Hello' })
    })

    it('includes tools in request body when provided', async () => {
      let receivedBody = ''

      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => {
          receivedBody = data
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })
          res.write(sseChunk(makeTextDelta('Done')))
          res.write(sseDone())
          res.end()
        })
      }

      const tools = [
        {
          type: 'function' as const,
          function: {
            name: 'read_transcript',
            description: 'Read transcript',
            parameters: { type: 'object', properties: {} },
          },
        },
      ]

      await service.sendMessage(makeRequest({ tools }))

      const body = JSON.parse(receivedBody)
      expect(body.tools).toEqual(tools)
    })
  })

  describe('token streaming', () => {
    it('emits stream-token events for each content delta', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.write(sseChunk(makeTextDelta('Hello')))
        res.write(sseChunk(makeTextDelta(' world')))
        res.write(sseDone())
        res.end()
      }

      await service.sendMessage(makeRequest())

      const tokens = broadcasts
        .filter((b) => b.channel === 'chat:stream-token')
        .map((b) => b.args[0])
      expect(tokens).toEqual(['Hello', ' world'])
    })

    it('emits stream-end with complete content', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.write(sseChunk(makeTextDelta('Hello')))
        res.write(sseChunk(makeTextDelta(' world')))
        res.write(sseDone())
        res.end()
      }

      await service.sendMessage(makeRequest())

      const ends = broadcasts.filter((b) => b.channel === 'chat:stream-end')
      expect(ends).toHaveLength(1)
      expect(ends[0].args[0]).toEqual({ content: 'Hello world', aborted: false })
    })
  })

  describe('tool-call loop', () => {
    it('dispatches tool calls and feeds results back', async () => {
      let callCount = 0

      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => {
          callCount++
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })

          if (callCount === 1) {
            res.write(
              sseChunk(makeToolCallDelta(0, 'call_1', 'read_transcript', '{"episode_id":'))
            )
            res.write(sseChunk(makeToolCallArgsDelta(0, '"ep1"}')))
            res.write(sseDone())
          } else {
            const body = JSON.parse(data)
            const lastMsg = body.messages[body.messages.length - 1]
            expect(lastMsg.role).toBe('tool')
            expect(lastMsg.tool_call_id).toBe('call_1')
            expect(lastMsg.content).toBe('transcript content here')

            res.write(sseChunk(makeTextDelta('Here is the transcript.')))
            res.write(sseDone())
          }
          res.end()
        })
      }

      const executor: ToolExecutor = vi.fn(async () => 'transcript content here')
      service.setToolExecutor(executor)

      await service.sendMessage(makeRequest())

      expect(executor).toHaveBeenCalledWith('read_transcript', { episode_id: 'ep1' })
      expect(callCount).toBe(2)

      const toolStarts = broadcasts.filter((b) => b.channel === 'chat:tool-call-start')
      expect(toolStarts).toHaveLength(1)
      expect(toolStarts[0].args[0]).toEqual({ id: 'call_1', name: 'read_transcript' })

      const toolResults = broadcasts.filter((b) => b.channel === 'chat:tool-call-result')
      expect(toolResults).toHaveLength(1)
      expect(toolResults[0].args[0]).toEqual({
        id: 'call_1',
        name: 'read_transcript',
        result: 'transcript content here',
      })

      const ends = broadcasts.filter((b) => b.channel === 'chat:stream-end')
      expect(ends).toHaveLength(1)
      expect((ends[0].args[0] as { content: string }).content).toBe('Here is the transcript.')
    })

    it('handles multiple tool calls in one response', async () => {
      let callCount = 0

      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => {
          callCount++
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })

          if (callCount === 1) {
            res.write(sseChunk(makeToolCallDelta(0, 'call_a', 'read_transcript', '{"episode_id":"ep1"}')))
            res.write(sseChunk(makeToolCallDelta(1, 'call_b', 'read_summary', '{"view_type":"brief"}')))
            res.write(sseDone())
          } else {
            res.write(sseChunk(makeTextDelta('Combined result.')))
            res.write(sseDone())
          }
          res.end()
        })
      }

      const executor: ToolExecutor = vi.fn(async (name) => `result of ${name}`)
      service.setToolExecutor(executor)

      await service.sendMessage(makeRequest())

      expect(executor).toHaveBeenCalledTimes(2)
      expect(executor).toHaveBeenCalledWith('read_transcript', { episode_id: 'ep1' })
      expect(executor).toHaveBeenCalledWith('read_summary', { view_type: 'brief' })

      const toolStarts = broadcasts.filter((b) => b.channel === 'chat:tool-call-start')
      expect(toolStarts).toHaveLength(2)
    })

    it('handles tool executor errors gracefully', async () => {
      let callCount = 0

      serverHandler = (req, res) => {
        let data = ''
        req.on('data', (chunk) => {
          data += chunk
        })
        req.on('end', () => {
          callCount++
          res.writeHead(200, { 'Content-Type': 'text/event-stream' })

          if (callCount === 1) {
            res.write(sseChunk(makeToolCallDelta(0, 'call_err', 'bad_tool', '{}')))
            res.write(sseDone())
          } else {
            const body = JSON.parse(data)
            const lastMsg = body.messages[body.messages.length - 1]
            expect(JSON.parse(lastMsg.content)).toEqual({ error: 'Tool failed' })

            res.write(sseChunk(makeTextDelta('Sorry, tool failed.')))
            res.write(sseDone())
          }
          res.end()
        })
      }

      const executor: ToolExecutor = vi.fn(async () => {
        throw new Error('Tool failed')
      })
      service.setToolExecutor(executor)

      await service.sendMessage(makeRequest())

      const ends = broadcasts.filter((b) => b.channel === 'chat:stream-end')
      expect(ends).toHaveLength(1)
      expect((ends[0].args[0] as { content: string }).content).toBe('Sorry, tool failed.')
    })
  })

  describe('abort', () => {
    it('cancels active request and emits stream-end with aborted flag', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(200, { 'Content-Type': 'text/event-stream' })
        res.write(sseChunk(makeTextDelta('partial')))
        // Don't end — simulate slow stream. The abort will terminate it.
      }

      const promise = service.sendMessage(makeRequest())

      // Give the stream time to start
      await new Promise((r) => setTimeout(r, 50))
      service.abort()

      await promise

      const ends = broadcasts.filter((b) => b.channel === 'chat:stream-end')
      expect(ends.length).toBeGreaterThanOrEqual(1)
      const lastEnd = ends[ends.length - 1]
      expect((lastEnd.args[0] as { aborted: boolean }).aborted).toBe(true)
    })
  })

  describe('error handling', () => {
    it('emits chat:error when no API key is configured', async () => {
      db.setSetting('openrouter_api_key', '')
      const dbNoKey = new DatabaseService(':memory:')
      const svcNoKey = new ChatService(dbNoKey)

      await svcNoKey.sendMessage(makeRequest())

      const errors = broadcasts.filter((b) => b.channel === 'chat:error')
      expect(errors.length).toBeGreaterThanOrEqual(1)
      expect(errors[0].args[0]).toContain('No API key')

      dbNoKey.close()
    })

    it('emits chat:error on HTTP error response', async () => {
      serverHandler = (_req, res) => {
        res.writeHead(429, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'rate limited' }))
      }

      await service.sendMessage(makeRequest())

      const errors = broadcasts.filter((b) => b.channel === 'chat:error')
      expect(errors).toHaveLength(1)
      expect(errors[0].args[0]).toContain('429')
    })

    it('emits chat:error on network failure', async () => {
      globalThis.fetch = origFetch
      globalThis.fetch = async () => {
        throw new Error('Network unreachable')
      }

      await service.sendMessage(makeRequest())

      const errors = broadcasts.filter((b) => b.channel === 'chat:error')
      expect(errors).toHaveLength(1)
      expect(errors[0].args[0]).toContain('Network unreachable')
    })
  })
})
