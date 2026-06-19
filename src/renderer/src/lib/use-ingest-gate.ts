import { useModelStatusStore } from '../store/model-status-store'

export interface IngestGate {
  available: boolean
  reason: string | null
}

export function useIngestGate(): IngestGate {
  const status = useModelStatusStore((s) => s.status)

  if (status.state === 'ready') {
    return { available: true, reason: null }
  }

  if (status.state === 'downloading') {
    return { available: false, reason: 'Transcription Model is downloading…' }
  }

  if (status.state === 'error') {
    return { available: false, reason: 'Transcription Model download failed' }
  }

  // not-downloaded
  return { available: false, reason: 'Transcription Model not available' }
}
