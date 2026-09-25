/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { settlePrintDocument } from './print-readiness'

let frameCallbacks: FrameRequestCallback[]
let requestFrame: ReturnType<typeof vi.fn>

beforeEach(() => {
  frameCallbacks = []
  requestFrame = vi.fn((callback: FrameRequestCallback) => {
    frameCallbacks.push(callback)
    return frameCallbacks.length
  })
  vi.stubGlobal('requestAnimationFrame', requestFrame)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

async function flushFrames(): Promise<void> {
  while (frameCallbacks.length > 0) {
    frameCallbacks.shift()!(0)
    await Promise.resolve()
  }
}

describe('settlePrintDocument', () => {
  it('waits for Mermaid blocks to reach a terminal state', async () => {
    const root = document.createElement('div')
    const mermaid = document.createElement('div')
    mermaid.dataset.mermaidState = 'pending'
    root.appendChild(mermaid)

    let settled = false
    const readiness = settlePrintDocument(root, 20).then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(requestFrame).not.toHaveBeenCalled()

    mermaid.dataset.mermaidState = 'rendered'
    await vi.waitFor(() => expect(requestFrame).toHaveBeenCalledOnce())
    await flushFrames()
    await readiness
    expect(settled).toBe(true)
  })

  it('waits for image load or error events', async () => {
    const root = document.createElement('div')
    const image = document.createElement('img')
    Object.defineProperty(image, 'complete', { configurable: true, value: false })
    root.appendChild(image)

    let settled = false
    const readiness = settlePrintDocument(root, 20).then(() => { settled = true })
    await Promise.resolve()
    expect(settled).toBe(false)
    expect(requestFrame).not.toHaveBeenCalled()

    image.dispatchEvent(new Event('error'))
    await vi.waitFor(() => expect(requestFrame).toHaveBeenCalledOnce())
    await flushFrames()
    await readiness
    expect(settled).toBe(true)
  })

  it('uses one bounded timeout for unavailable images', async () => {
    const root = document.createElement('div')
    const first = document.createElement('img')
    const second = document.createElement('img')
    Object.defineProperty(first, 'complete', { configurable: true, value: false })
    Object.defineProperty(second, 'complete', { configurable: true, value: false })
    root.append(first, second)

    const startedAt = Date.now()
    const readiness = settlePrintDocument(root, 5)
    await Promise.resolve()
    expect(requestFrame).not.toHaveBeenCalled()
    await vi.waitFor(() => expect(requestFrame).toHaveBeenCalledOnce(), { timeout: 100 })
    expect(Date.now() - startedAt).toBeGreaterThanOrEqual(4)
    await flushFrames()
    await expect(readiness).resolves.toBeUndefined()
  })

  it('waits for document fonts before final layout frames', async () => {
    let fontsReady!: () => void
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts')
    Object.defineProperty(document, 'fonts', {
      configurable: true,
      value: { ready: new Promise<void>((resolve) => { fontsReady = resolve }) },
    })

    const readiness = settlePrintDocument(document, 5)
    await Promise.resolve()
    expect(requestFrame).not.toHaveBeenCalled()
    fontsReady()
    await vi.waitFor(() => expect(requestFrame).toHaveBeenCalledOnce())
    await flushFrames()
    await readiness

    if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts)
    else Reflect.deleteProperty(document, 'fonts')
  })
})
