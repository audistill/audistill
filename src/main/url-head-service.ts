import { net } from 'electron'

export interface UrlHeadResult {
  contentType: string | null
  contentLength: number | null
}

export async function fetchUrlHead(url: string): Promise<UrlHeadResult> {
  const response = await net.fetch(url, { method: 'HEAD' })
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`)
  }
  const contentType = response.headers.get('content-type')
  const contentLengthRaw = response.headers.get('content-length')
  const contentLength = contentLengthRaw ? parseInt(contentLengthRaw, 10) : null
  return { contentType, contentLength }
}
