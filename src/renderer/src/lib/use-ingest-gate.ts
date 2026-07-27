import { useModelStatusStore } from '../store/model-status-store'

export interface IngestGate {
  available: boolean
  reason: string | null
}

export function useIngestGate(): IngestGate {
  const state = useModelStatusStore((s) => s.status.state)

  if (state === 'ready') {
    return { available: true, reason: null }
  }

  if (state === 'downloading') {
    return { available: false, reason: 'Transcription Model is downloading…' }
  }

  if (state === 'error') {
    return { available: false, reason: 'Transcription Model download failed' }
  }

  // not-downloaded
  return { available: false, reason: 'Transcription Model not available' }
}
