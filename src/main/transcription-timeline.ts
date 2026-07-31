export const TRANSCRIPTION_SAMPLE_RATE = 16_000

export interface TranscriptTimeRange {
  start: number
  end: number
}

export interface TranscriptionWindowRange {
  startSample: number
  endSample: number
}

export function transcriptionWindowRanges(
  totalSamples: number,
  windowSamples: number,
  minimumWindowSamples: number,
): TranscriptionWindowRange[] {
  if (windowSamples <= 0) throw new RangeError('Transcription window size must be positive')
  if (minimumWindowSamples <= 0) throw new RangeError('Minimum Transcription window size must be positive')

  const ranges: TranscriptionWindowRange[] = []
  let startSample = 0
  while (startSample < totalSamples) {
    let endSample = Math.min(startSample + windowSamples, totalSamples)
    const remainingSamples = totalSamples - endSample
    if (remainingSamples > 0 && remainingSamples < minimumWindowSamples) {
      endSample = totalSamples
    }
    ranges.push({ startSample, endSample })
    startSample = endSample
  }
  return ranges
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
