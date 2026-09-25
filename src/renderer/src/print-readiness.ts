const DEFAULT_IMAGE_TIMEOUT_MS = 5_000

function waitForMermaid(root: ParentNode): Promise<void> {
  if (!root.querySelector('[data-mermaid-state="pending"]')) return Promise.resolve()

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (root.querySelector('[data-mermaid-state="pending"]')) return
      observer.disconnect()
      resolve()
    })
    observer.observe(root, { attributes: true, childList: true, subtree: true })
  })
}

function waitForImages(root: ParentNode, timeoutMs: number): Promise<void> {
  const pending = [...root.querySelectorAll('img')].filter((image) => !image.complete)
  if (pending.length === 0) return Promise.resolve()

  return new Promise((resolve) => {
    let remaining = pending.length
    const cleanup = (): void => {
      clearTimeout(timeout)
      for (const image of pending) {
        image.removeEventListener('load', settleImage)
        image.removeEventListener('error', settleImage)
      }
    }
    const finish = (): void => {
      cleanup()
      resolve()
    }
    const settleImage = (): void => {
      remaining -= 1
      if (remaining === 0) finish()
    }
    const timeout = setTimeout(finish, timeoutMs)

    for (const image of pending) {
      image.addEventListener('load', settleImage, { once: true })
      image.addEventListener('error', settleImage, { once: true })
    }
  })
}

function waitForFonts(root: ParentNode): Promise<unknown> {
  const ownerDocument = root.nodeType === Node.DOCUMENT_NODE
    ? root as Document
    : (root as Node).ownerDocument
  return ownerDocument?.fonts?.ready ?? Promise.resolve()
}

export async function settlePrintDocument(
  root: ParentNode = document,
  imageTimeoutMs = DEFAULT_IMAGE_TIMEOUT_MS
): Promise<void> {
  await Promise.all([
    waitForFonts(root),
    waitForMermaid(root),
    waitForImages(root, imageTimeoutMs),
  ])
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
  await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
}
