import { describe, it, expect, beforeEach, vi } from 'vitest'
import { join } from 'node:path'
import { DatabaseService } from './database-service'
import { RecipeService } from './recipe-service'

const promptsDir = join(__dirname, 'prompts')

vi.mock('electron', () => ({
  net: {
    fetch: vi.fn(),
  },
}))

import { net } from 'electron'

function createTestDb(): DatabaseService {
  return new DatabaseService(':memory:')
}

describe('RecipeService - message assembly', () => {
  let db: DatabaseService
  let service: RecipeService

  beforeEach(() => {
    db = createTestDb()
    service = new RecipeService(db, promptsDir)
    vi.mocked(net.fetch).mockReset()
  })

  function mockStreamResponse(content: string): void {
    const sseData = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(sseData))
        controller.close()
      },
    })
    vi.mocked(net.fetch).mockResolvedValue({
      ok: true,
      body: stream,
    } as any)
  }

  it('sends three messages: system frame, user instructions+template, user transcript', async () => {
    db.setSetting('openrouter_api_key', 'test-key')
    const recipe = service.getPipelineRecipe()!
    mockStreamResponse('TITLE: Test\n---\nContent')

    await service.executeRecipe(recipe.id, 'hello world', () => {})

    const fetchCall = vi.mocked(net.fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]!.body as string)
    const messages = body.messages

    expect(messages).toHaveLength(3)
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('<output-format>')
    expect(messages[0].content).toContain('<markdown-rules>')
    expect(messages[1].role).toBe('user')
    expect(messages[1].content).toContain('<template>')
    expect(messages[2].role).toBe('user')
    expect(messages[2].content).toContain('<transcript>')
  })

  it('includes custom instructions in user message when set', async () => {
    db.setSetting('openrouter_api_key', 'test-key')
    db.setSetting('custom_instructions', 'Always write in bullet points')
    const recipe = service.getPipelineRecipe()!
    mockStreamResponse('content')

    await service.executeRecipe(recipe.id, 'transcript', () => {})

    const fetchCall = vi.mocked(net.fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]!.body as string)
    const instructionsMsg = body.messages[1]

    expect(instructionsMsg.content).toContain('<instructions>')
    expect(instructionsMsg.content).toContain('Always write in bullet points')
  })

  it('omits instructions tag when custom instructions are empty', async () => {
    db.setSetting('openrouter_api_key', 'test-key')
    const recipe = service.getPipelineRecipe()!
    mockStreamResponse('content')

    await service.executeRecipe(recipe.id, 'transcript', () => {})

    const fetchCall = vi.mocked(net.fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]!.body as string)
    const instructionsMsg = body.messages[1]

    expect(instructionsMsg.content).not.toContain('<instructions>')
  })

  it('system message does not contain recipe prompt text', async () => {
    db.setSetting('openrouter_api_key', 'test-key')
    const recipe = service.getPipelineRecipe()!
    mockStreamResponse('content')

    await service.executeRecipe(recipe.id, 'transcript', () => {})

    const fetchCall = vi.mocked(net.fetch).mock.calls[0]
    const body = JSON.parse(fetchCall[1]!.body as string)
    const systemMsg = body.messages[0]

    expect(systemMsg.content).not.toContain(recipe.prompt)
  })
})
