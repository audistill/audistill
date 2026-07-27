import { net, BrowserWindow } from 'electron'
import { DatabaseService } from './database-service'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool'
  content: string | null
  tool_calls?: ToolCall[]
  tool_call_id?: string
  name?: string
}

export interface ToolCall {
  id: string
  type: 'function'
  function: {
    name: string
    arguments: string
  }
}

export interface ToolDefinition {
  type: 'function'
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface ChatRequest {
  model: string
  systemPrompt: string
  messages: ChatMessage[]
  tools: ToolDefinition[]
}

export type ToolExecutor = (
  toolName: string,
  args: Record<string, unknown>
) => Promise<string>

function broadcast(channel: string, ...args: unknown[]): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args)
    }
  }
}

export class ChatService {
  private db: DatabaseService
  private toolExecutor: ToolExecutor | null = null
  private activeController: AbortController | null = null

  constructor(db: DatabaseService) {
    this.db = db
  }

  setToolExecutor(executor: ToolExecutor): void {
    this.toolExecutor = executor
  }

  async sendMessage(request: ChatRequest): Promise<void> {
    const apiKey = this.db.getSetting('openrouter_api_key')
    if (!apiKey) {
      broadcast('chat:error', 'No API key configured. Please set your OpenRouter API key in Settings.')
      return
    }

    this.activeController = new AbortController()
    const { signal } = this.activeController

    const messages: ChatMessage[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.messages,
    ]

    try {
      await this.completionLoop(apiKey, request.model, messages, request.tools, signal)
    } catch (err) {
      if (signal.aborted) return
      const message = err instanceof Error ? err.message : String(err)
      broadcast('chat:error', message)
    } finally {
      this.activeController = null
    }
  }

  abort(): void {
    if (this.activeController) {
      this.activeController.abort()
      this.activeController = null
      broadcast('chat:stream-end', { aborted: true })
    }
  }

  private async completionLoop(
    apiKey: string,
    model: string,
    messages: ChatMessage[],
    tools: ToolDefinition[],
    signal: AbortSignal
  ): Promise<void> {
    while (!signal.aborted) {
      const body: Record<string, unknown> = {
        model,
        messages,
        stream: true,
      }
      if (tools.length > 0) {
        body.tools = tools
      }

      const response = await net.fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://audistill.app',
        },
        body: JSON.stringify(body),
        signal: signal as unknown as AbortSignal,
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`OpenRouter API error (${response.status}): ${text}`)
      }

      const result = await this.readStream(response, signal)

      if (signal.aborted) return

      if (result.toolCalls && result.toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: result.content || null,
          tool_calls: result.toolCalls,
        })

        for (const toolCall of result.toolCalls) {
          if (signal.aborted) return

          broadcast('chat:tool-call-start', {
            id: toolCall.id,
            name: toolCall.function.name,
          })

          let toolResult: string
          try {
            const args = JSON.parse(toolCall.function.arguments)
            if (!this.toolExecutor) {
              toolResult = JSON.stringify({ error: 'No tool executor configured' })
            } else {
              toolResult = await this.toolExecutor(toolCall.function.name, args)
            }
          } catch (err) {
            console.error('[chat] Failed to parse tool call arguments:', toolCall.function.arguments)
            console.error('[chat] Error:', err)
            toolResult = JSON.stringify({
              error: err instanceof Error ? err.message : String(err),
            })
          }

          messages.push({
            role: 'tool',
            content: toolResult,
            tool_call_id: toolCall.id,
          })

          broadcast('chat:tool-call-result', {
            id: toolCall.id,
            name: toolCall.function.name,
            result: toolResult,
          })
        }

        continue
      }

      broadcast('chat:stream-end', {
        content: result.content,
        aborted: false,
      })
      return
    }
  }

  private async readStream(
    response: Response,
    signal: AbortSignal
  ): Promise<{ content: string; toolCalls: ToolCall[] }> {
    let content = ''
    const toolCalls: Map<number, ToolCall> = new Map()
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (!signal.aborted) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (signal.aborted) break
          const trimmed = line.trim()
          if (!trimmed || !trimmed.startsWith('data: ')) continue
          const data = trimmed.slice(6)
          if (data === '[DONE]') break

          let parsed: unknown
          try {
            parsed = JSON.parse(data)
          } catch {
            continue
          }

          const delta = (parsed as { choices?: { delta?: Record<string, unknown> }[] })?.choices?.[0]?.delta
          if (!delta) continue

          if (typeof delta.content === 'string') {
            content += delta.content
            broadcast('chat:stream-token', delta.content)
          }

          if (Array.isArray(delta.tool_calls)) {
            for (const tc of delta.tool_calls as { index: number; id?: string; function?: { name?: string; arguments?: string } }[]) {
              const existing = toolCalls.get(tc.index)
              if (existing) {
                if (tc.function?.arguments) {
                  existing.function.arguments += tc.function.arguments
                }
              } else {
                toolCalls.set(tc.index, {
                  id: tc.id || '',
                  type: 'function',
                  function: {
                    name: tc.function?.name || '',
                    arguments: tc.function?.arguments || '',
                  },
                })
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (signal.aborted) {
      broadcast('chat:stream-end', { content, aborted: true })
    }

    return {
      content,
      toolCalls: Array.from(toolCalls.values()),
    }
  }
}
