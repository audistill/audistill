export const TRANSCRIPTION_SAMPLE_RATE = 16_000

export interface TranscriptTimeRange {
  start: number
  end: number
}

export function transcriptTimeRange(
  startSample: number,
  sampleCount: number,
  totalSamples: number,
): TranscriptTimeRange {
  return {
    start: startSample / TRANSCRIPTION_SAMPLE_RATE,
    end: Math.min(startSample + sampleCount, totalSamples) / TRANSCRIPTION_SAMPLE_RATE,
  }
}
