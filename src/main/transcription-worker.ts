import { parentPort } from 'node:worker_threads'
import { join } from 'node:path'
import { InferenceSession, Tensor } from 'onnxruntime-node'
import { readFileSync } from 'node:fs'

interface StartMessage {
  type: 'start'
  audioBuffer: SharedArrayBuffer
  modelPath: string
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

type OutboundMessage = ProgressMessage | SegmentMessage | DoneMessage | ErrorMessage

const SAMPLE_RATE = 16000
const CHUNK_SECONDS = 30
const CHUNK_SAMPLES = CHUNK_SECONDS * SAMPLE_RATE
const OVERLAP_SECONDS = 1
const OVERLAP_SAMPLES = OVERLAP_SECONDS * SAMPLE_RATE
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
    const targetsTensor = new Tensor('int64', BigInt64Array.from([BigInt(targetToken)]), [1, 1])
    const targetLengthTensor = new Tensor('int64', BigInt64Array.from([BigInt(1)]), [1])
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

async function transcribe(audioBuffer: SharedArrayBuffer, modelPath: string): Promise<void> {
  const pcm = new Float32Array(audioBuffer)
  const totalSamples = pcm.length

  const vocab = loadVocab(modelPath)
  const blankIdx = vocab.length - 1

  post({ type: 'progress', percent: 0 })

  const preprocessorSession = await InferenceSession.create(
    join(modelPath, 'nemo128.onnx'),
    { executionProviders: ['cpu'] }
  )

  const encoderSession = await InferenceSession.create(
    join(modelPath, 'encoder-model.int8.onnx'),
    { executionProviders: ['cpu'], graphOptimizationLevel: 'all' }
  )

  const decoderSession = await InferenceSession.create(
    join(modelPath, 'decoder_joint-model.int8.onnx'),
    { executionProviders: ['cpu'], graphOptimizationLevel: 'all' }
  )

  post({ type: 'progress', percent: 5 })

  const stepSamples = CHUNK_SAMPLES - OVERLAP_SAMPLES
  const numChunks = Math.ceil(totalSamples / stepSamples)

  for (let chunkIdx = 0; chunkIdx < numChunks; chunkIdx++) {
    const startSample = chunkIdx * stepSamples
    const endSample = Math.min(startSample + CHUNK_SAMPLES, totalSamples)
    const chunkPcm = pcm.slice(startSample, endSample)

    const chunkStartTime = startSample / SAMPLE_RATE
    const chunkEndTime = endSample / SAMPLE_RATE

    const { features, featureDim, timeFrames } = await runPreprocessor(
      preprocessorSession,
      chunkPcm
    )

    const { encoded, encodedLen, encodedDim } = await runEncoder(
      encoderSession,
      features,
      featureDim,
      timeFrames
    )

    const transposed = transposeEncoded(encoded, encodedDim, encodedLen)

    const chunkTokens = await decodeChunk(
      decoderSession,
      transposed,
      encodedLen,
      encodedDim,
      vocab,
      blankIdx
    )

    const text = decodeTokens(chunkTokens, vocab)

    if (text.length > 0) {
      post({
        type: 'segment',
        start: chunkStartTime,
        end: chunkEndTime,
        text
      })
    }

    const percent = Math.round(5 + ((chunkIdx + 1) / numChunks) * 95)
    post({ type: 'progress', percent: Math.min(percent, 100) })
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

parentPort!.on('message', async (msg: StartMessage) => {
  if (msg.type !== 'start') return

  try {
    await transcribe(msg.audioBuffer, msg.modelPath)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    post({ type: 'error', message })
  }
})
