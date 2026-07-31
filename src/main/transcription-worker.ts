import { parentPort } from 'node:worker_threads'
import { join } from 'node:path'
import { cpus } from 'node:os'
import { InferenceSession, Tensor } from 'onnxruntime-node'
import { readFileSync } from 'node:fs'
import {
  TRANSCRIPTION_SAMPLE_RATE,
  transcriptionWindowRanges,
  transcriptTimeRange,
} from './transcription-timeline'

const INTRA_OP_THREADS = Math.max(1, Math.floor(cpus().length / 2))

interface StartMessage {
  type: 'start'
  audioBuffer: SharedArrayBuffer
  modelPath: string
}

interface StreamStartMessage {
  type: 'stream-start'
  modelPath: string
  totalSamples: number
}

interface StreamChunkMessage {
  type: 'stream-chunk'
  id: string
  audioBuffer: ArrayBuffer
}

interface StreamEndMessage {
  type: 'stream-end'
}

interface ProgressMessage {
  type: 'progress'
  percent: number
}

interface SegmentMessage {
  type: 'segment'
  start: number
  end: number
  text: string
}

interface DoneMessage {
  type: 'done'
}

interface ErrorMessage {
  type: 'error'
  message: string
}

interface StreamReadyMessage { type: 'stream-ready' }
interface StreamChunkAcceptedMessage { type: 'stream-chunk-accepted'; id: string }

type OutboundMessage = ProgressMessage | SegmentMessage | DoneMessage | ErrorMessage | StreamReadyMessage | StreamChunkAcceptedMessage

const SAMPLE_RATE = TRANSCRIPTION_SAMPLE_RATE
const CHUNK_SECONDS = 30
const CHUNK_SAMPLES = CHUNK_SECONDS * SAMPLE_RATE
// The packaged preprocessor uses reflect padding of 256 samples per side.
const MIN_CHUNK_SAMPLES = 257
const MAX_TOKENS_PER_STEP = 10

function post(msg: OutboundMessage): void {
  parentPort!.postMessage(msg)
}

function loadVocab(modelPath: string): string[] {
  const content = readFileSync(join(modelPath, 'vocab.txt'), 'utf-8')
  const lines = content.trim().split('\n')
  const vocab: string[] = []
  for (const line of lines) {
    const lastSpace = line.lastIndexOf(' ')
    const token = line.substring(0, lastSpace)
    const id = parseInt(line.substring(lastSpace + 1), 10)
    vocab[id] = token
  }
  return vocab
}

function decodeTokens(tokens: number[], vocab: string[]): string {
  let text = ''
  for (const t of tokens) {
    const token = vocab[t]
    if (token === undefined) continue
    text += token
  }
  return text.replace(/▁/g, ' ').trim()
}

async function runPreprocessor(
  session: InferenceSession,
  pcmFloat32: Float32Array
): Promise<{ features: Float32Array; featuresLen: number; featureDim: number; timeFrames: number }> {
  const waveforms = new Tensor('float32', pcmFloat32, [1, pcmFloat32.length])
  const waveformsLens = new Tensor('int64', BigInt64Array.from([BigInt(pcmFloat32.length)]), [1])

  const results = await session.run({
    waveforms: waveforms,
    waveforms_lens: waveformsLens
  })

  const features = results['features']
  const featuresLens = results['features_lens']

  const dims = features.dims
  const featureDim = dims[1] as number
  const timeFrames = dims[2] as number
  const featuresLen = Number((featuresLens.data as BigInt64Array)[0])

  return {
    features: features.data as Float32Array,
    featuresLen,
    featureDim,
    timeFrames
  }
}

async function runEncoder(
  session: InferenceSession,
  features: Float32Array,
  featureDim: number,
  timeFrames: number
): Promise<{ encoded: Float32Array; encodedLen: number; encodedDim: number; encodedTime: number }> {
  const audioSignal = new Tensor('float32', features, [1, featureDim, timeFrames])
  const length = new Tensor('int64', BigInt64Array.from([BigInt(timeFrames)]), [1])

  const results = await session.run({
    audio_signal: audioSignal,
    length: length
  })

  const outputs = results['outputs']
  const encodedLengths = results['encoded_lengths']

  const encodedDim = outputs.dims[1] as number
  const encodedTime = outputs.dims[2] as number
  const encodedLen = Number((encodedLengths.data as BigInt64Array)[0])

  return {
    encoded: outputs.data as Float32Array,
    encodedLen,
    encodedDim,
    encodedTime
  }
}

function getStateShape(session: InferenceSession, name: string): number[] {
  const meta = session.inputMetadata
  for (const m of meta) {
    if (m.name === name && m.isTensor) {
      const shape = m.shape.map((d) => (typeof d === 'number' ? d : 1))
      if (shape.every((d) => d > 0)) return shape
    }
  }
  return [1, 1, 640]
}

async function decodeChunk(
  decoderSession: InferenceSession,
  encoded: Float32Array,
  encodedLen: number,
  encodedDim: number,
  vocab: string[],
  blankIdx: number
): Promise<number[]> {
  const vocabSize = vocab.length

  const state1Shape = getStateShape(decoderSession, 'input_states_1')
  const state2Shape = getStateShape(decoderSession, 'input_states_2')

  const state1Size = state1Shape.reduce((a, b) => a * b, 1)
  const state2Size = state2Shape.reduce((a, b) => a * b, 1)
  let state1 = new Float32Array(state1Size)
  let state2 = new Float32Array(state2Size)

  const tokens: number[] = []
  let t = 0
  let emittedTokens = 0

  while (t < encodedLen) {
    const frameOffset = t * encodedDim
    const encoderFrame = encoded.slice(frameOffset, frameOffset + encodedDim)

    const encoderOutputTensor = new Tensor('float32', encoderFrame, [1, encodedDim, 1])
    const targetToken = tokens.length > 0 ? tokens[tokens.length - 1] : blankIdx
    const targetsTensor = new Tensor('int32', Int32Array.from([targetToken]), [1, 1])
    const targetLengthTensor = new Tensor('int32', Int32Array.from([1]), [1])
    const state1Tensor = new Tensor('float32', state1, state1Shape)
    const state2Tensor = new Tensor('float32', state2, state2Shape)

    const feeds: Record<string, Tensor> = {
      encoder_outputs: encoderOutputTensor,
      targets: targetsTensor,
      target_length: targetLengthTensor,
      input_states_1: state1Tensor,
      input_states_2: state2Tensor
    }

    const results = await decoderSession.run(feeds)

    const output = results['outputs'].data as Float32Array
    const newState1 = results['output_states_1'].data as Float32Array
    const newState2 = results['output_states_2'].data as Float32Array

    const tokenLogits = output.slice(0, vocabSize)
    const durationLogits = output.slice(vocabSize)

    let bestToken = 0
    let bestScore = tokenLogits[0]
    for (let i = 1; i < tokenLogits.length; i++) {
      if (tokenLogits[i] > bestScore) {
        bestScore = tokenLogits[i]
        bestToken = i
      }
    }

    let step = 0
    if (durationLogits.length > 0) {
      let bestDur = 0
      let bestDurScore = durationLogits[0]
      for (let i = 1; i < durationLogits.length; i++) {
        if (durationLogits[i] > bestDurScore) {
          bestDurScore = durationLogits[i]
          bestDur = i
        }
      }
      step = bestDur
    }

    if (bestToken !== blankIdx) {
      state1 = new Float32Array(newState1)
      state2 = new Float32Array(newState2)
      tokens.push(bestToken)
      emittedTokens++
    }

    if (step > 0) {
      t += step
      emittedTokens = 0
    } else if (bestToken === blankIdx || emittedTokens >= MAX_TOKENS_PER_STEP) {
      t += 1
      emittedTokens = 0
    }
  }

  return tokens
}

interface TranscriptionSessions {
  vocab: string[]
  blankIdx: number
  preprocessor: InferenceSession
  encoder: InferenceSession
  decoder: InferenceSession
}

async function createSessions(modelPath: string): Promise<TranscriptionSessions> {
  const vocab = loadVocab(modelPath)
  const coreml = { name: 'coreml' as const, coreMlFlags: 0x010 | 0x008 | 0x020 }
  const preprocessor = await InferenceSession.create(join(modelPath, 'nemo128.onnx'), {
    executionProviders: [coreml, 'cpu'], intraOpNumThreads: INTRA_OP_THREADS,
  })
  const encoder = await InferenceSession.create(join(modelPath, 'encoder-model.fp16.onnx'), {
    executionProviders: [coreml, 'cpu'], graphOptimizationLevel: 'all', intraOpNumThreads: INTRA_OP_THREADS,
  })
  const decoder = await InferenceSession.create(join(modelPath, 'decoder_joint-model.fp16.onnx'), {
    executionProviders: [coreml, 'cpu'], graphOptimizationLevel: 'all', intraOpNumThreads: INTRA_OP_THREADS,
  })
  return { vocab, blankIdx: vocab.length - 1, preprocessor, encoder, decoder }
}

async function processPcmChunk(
  sessions: TranscriptionSessions,
  pcm: Float32Array,
  startSample: number,
  totalSamples: number,
): Promise<void> {
  const { features, featureDim, timeFrames } = await runPreprocessor(sessions.preprocessor, pcm)
  const { encoded, encodedLen, encodedDim } = await runEncoder(sessions.encoder, features, featureDim, timeFrames)
  const transposed = transposeEncoded(encoded, encodedDim, encodedLen)
  const tokens = await decodeChunk(sessions.decoder, transposed, encodedLen, encodedDim, sessions.vocab, sessions.blankIdx)
  const text = decodeTokens(tokens, sessions.vocab)
  if (text.length > 0) {
    post({ type: 'segment', ...transcriptTimeRange(startSample, pcm.length, totalSamples), text })
  }
  const completedSamples = Math.min(startSample + pcm.length, totalSamples)
  post({ type: 'progress', percent: Math.min(100, Math.round(5 + completedSamples / totalSamples * 95)) })
}

async function transcribe(audioBuffer: SharedArrayBuffer, modelPath: string): Promise<void> {
  const pcm = new Float32Array(audioBuffer)
  post({ type: 'progress', percent: 0 })
  const sessions = await createSessions(modelPath)
  post({ type: 'progress', percent: 5 })
  for (const { startSample, endSample } of transcriptionWindowRanges(
    pcm.length,
    CHUNK_SAMPLES,
    MIN_CHUNK_SAMPLES,
  )) {
    await processPcmChunk(sessions, pcm.slice(startSample, endSample), startSample, pcm.length)
  }
  post({ type: 'done' })
}

interface QueuedPcmChunk { id: string; pcm: Float32Array }

class PcmChunkQueue {
  private items: QueuedPcmChunk[] = []
  private ended = false
  private waiter: ((item: QueuedPcmChunk | null) => void) | null = null

  push(item: QueuedPcmChunk): void {
    if (this.waiter) {
      const waiter = this.waiter
      this.waiter = null
      waiter(item)
    } else {
      this.items.push(item)
    }
  }

  end(): void {
    this.ended = true
    this.waiter?.(null)
    this.waiter = null
  }

  take(): Promise<QueuedPcmChunk | null> {
    const item = this.items.shift()
    if (item) return Promise.resolve(item)
    if (this.ended) return Promise.resolve(null)
    return new Promise((resolve) => { this.waiter = resolve })
  }
}

async function transcribeStreaming(queue: PcmChunkQueue, modelPath: string, totalSamples: number): Promise<void> {
  post({ type: 'progress', percent: 0 })
  const sessions = await createSessions(modelPath)
  post({ type: 'progress', percent: 5 })
  post({ type: 'stream-ready' })
  let pending = new Float32Array(0)
  let startSample = 0
  let processedChunk = false

  while (true) {
    const item = await queue.take()
    if (!item) break
    const combined = new Float32Array(pending.length + item.pcm.length)
    combined.set(pending)
    combined.set(item.pcm, pending.length)
    pending = combined
    post({ type: 'stream-chunk-accepted', id: item.id })

    // Keep a minimum-sized tail so the model never receives an invalid tiny final window.
    while (pending.length >= CHUNK_SAMPLES + MIN_CHUNK_SAMPLES) {
      await processPcmChunk(sessions, pending.slice(0, CHUNK_SAMPLES), startSample, totalSamples)
      pending = pending.slice(CHUNK_SAMPLES)
      startSample += CHUNK_SAMPLES
      processedChunk = true
    }
  }

  if (pending.length > 0 || !processedChunk) {
    await processPcmChunk(sessions, pending, startSample, totalSamples)
  }
  post({ type: 'done' })
}

function transposeEncoded(
  encoded: Float32Array,
  encodedDim: number,
  encodedTime: number
): Float32Array {
  const result = new Float32Array(encodedTime * encodedDim)
  for (let t = 0; t < encodedTime; t++) {
    for (let d = 0; d < encodedDim; d++) {
      result[t * encodedDim + d] = encoded[d * encodedTime + t]
    }
  }
  return result
}

let streamQueue: PcmChunkQueue | null = null

parentPort!.on('message', (msg: StartMessage | StreamStartMessage | StreamChunkMessage | StreamEndMessage) => {
  if (msg.type === 'stream-chunk') {
    streamQueue?.push({ id: msg.id, pcm: new Float32Array(msg.audioBuffer) })
    return
  }
  if (msg.type === 'stream-end') {
    streamQueue?.end()
    return
  }
  if (msg.type === 'stream-start') {
    streamQueue = new PcmChunkQueue()
    transcribeStreaming(streamQueue, msg.modelPath, msg.totalSamples).catch((err) => {
      post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
    })
    return
  }
  transcribe(msg.audioBuffer, msg.modelPath).catch((err) => {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  })
})
