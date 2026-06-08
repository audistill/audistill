import { describe, it, expect } from 'vitest'
import { join } from 'node:path'
import { SummarizationService } from './summarization-service'
import { DatabaseService } from './database-service'

function createStubDb(settings: Record<string, string> = {}): DatabaseService {
  return {
    getSetting(key: string): string | null {
      return settings[key] ?? null
    },
  } as unknown as DatabaseService
}

const promptsDir = join(__dirname, 'prompts')

describe('SummarizationService.resolveModel', () => {
  it('brief view type reads model_fast from DB', () => {
    const db = createStubDb({ model_fast: 'anthropic/claude-haiku' })
    const service = new SummarizationService(db, promptsDir)

    expect(service.resolveModel('brief')).toBe('anthropic/claude-haiku')
  })

  it('detailed view type reads model_quality from DB', () => {
    const db = createStubDb({ model_quality: 'anthropic/claude-sonnet' })
    const service = new SummarizationService(db, promptsDir)

    expect(service.resolveModel('detailed')).toBe('anthropic/claude-sonnet')
  })

  it('full view type reads model_quality from DB', () => {
    const db = createStubDb({ model_quality: 'openai/gpt-4o' })
    const service = new SummarizationService(db, promptsDir)

    expect(service.resolveModel('full')).toBe('openai/gpt-4o')
  })

  it('defaults to google/gemini-3.1-flash-lite when model_fast is unset', () => {
    const db = createStubDb({})
    const service = new SummarizationService(db, promptsDir)

    expect(service.resolveModel('brief')).toBe('google/gemini-3.1-flash-lite')
  })

  it('defaults to google/gemini-3.5-flash when model_quality is unset', () => {
    const db = createStubDb({})
    const service = new SummarizationService(db, promptsDir)

    expect(service.resolveModel('detailed')).toBe('google/gemini-3.5-flash')
    expect(service.resolveModel('full')).toBe('google/gemini-3.5-flash')
  })
})
