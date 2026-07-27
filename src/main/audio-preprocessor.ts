import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { access } from 'node:fs/promises'
import { dirname, extname, resolve } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { app } from 'electron'
import { SUPPORTED_EXTENSIONS } from '../shared/supported-formats'
import { readAndValidateRecordingManifest } from './recording-session-coordinator'

export function resolveFFmpegBin(): string | null {
  if (!ffmpegPath) return null
  if (!app.isPackaged) return ffmpegPath
  return ffmpegPath.replace('app.asar', 'app.asar.unpacked')
}

export function parseFfmpegError(stderr: string): string {
  if (/does not contain any stream/i.test(stderr)) {
    return 'This file contains no audio track.'
  }
  if (/invalid data found|corrupt/i.test(stderr)) {
    return 'This file appears to be corrupted or incomplete.'
  }
  if (/decoder .* not found|codec not currently supported/i.test(stderr)) {
    return 'This audio format is not supported.'
  }
  return 'Could not process this file. Try converting it to MP3 first.'
}

export function spawnRecordedPreprocessor(manifestPath: string): ChildProcessWithoutNullStreams {
  const recording = readAndValidateRecordingManifest(manifestPath)
  const segments = [...recording.manifest.segments].sort((a, b) => a.activeStartMs - b.activeStartMs)
  const bin = resolveFFmpegBin()
  if (!bin) throw new Error('FFmpeg binary not found. Ensure ffmpeg-static is installed correctly.')

  const args = ['-nostdin', '-hide_banner', '-loglevel', 'error']
  for (const segment of segments) args.push('-i', resolve(dirname(manifestPath), segment.path))

  const activeDurationSec = recording.manifest.activeDurationMs / 1_000
  const filters: string[] = []
  const sourceLabels: string[] = []
  for (const sourceKind of recording.manifest.sourceKinds) {
    const sourceSegments = segments
      .map((segment, index) => ({ segment, index }))
      .filter(({ segment }) => segment.sourceKind === sourceKind)
    const delayedLabels = sourceSegments.map(({ segment, index }, sourceIndex) => {
      const label = `${sourceKind.replace('-', '')}${sourceIndex}`
      filters.push(
        `[${index}:a]aformat=sample_fmts=flt:sample_rates=16000:channel_layouts=mono,` +
        `atrim=duration=${segment.durationMs / 1_000},asetpts=PTS-STARTPTS,` +
        `adelay=delays=${segment.activeStartMs}:all=1[${label}]`,
      )
      return `[${label}]`
    })
    const sourceLabel = sourceKind.replace('-', '')
    const gain = recording.manifest.sourceKinds.length > 1 ? 0.5 : 1
    if (delayedLabels.length === 0) {
      filters.push(`anullsrc=r=16000:cl=mono,atrim=duration=${activeDurationSec},volume=${gain}[${sourceLabel}]`)
    } else {
      filters.push(
        `${delayedLabels.join('')}amix=inputs=${delayedLabels.length}:normalize=0:dropout_transition=0,` +
        `apad=whole_dur=${activeDurationSec},atrim=duration=${activeDurationSec},volume=${gain}[${sourceLabel}]`,
      )
    }
    sourceLabels.push(`[${sourceLabel}]`)
  }
  if (sourceLabels.length > 1) {
    filters.push(`${sourceLabels.join('')}amix=inputs=${sourceLabels.length}:normalize=0:dropout_transition=0[out]`)
  } else {
    filters.push(`${sourceLabels[0]}anull[out]`)
  }
  args.push('-filter_complex', filters.join(';'), '-map', '[out]')
  args.push('-ar', '16000', '-ac', '1', '-f', 'f32le', 'pipe:1')
  return spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] })
}

export async function preprocess(inputPath: string): Promise<Buffer> {
  const ext = extname(inputPath).toLowerCase()

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported file format "${ext}". Supported formats: ${[...SUPPORTED_EXTENSIONS].map((e) => e.slice(1).toUpperCase()).join(', ')}.`
    )
  }

  await access(inputPath).catch(() => {
    throw new Error(`File not found: ${inputPath}`)
  })

  const bin = resolveFFmpegBin()
  if (!bin) {
    throw new Error('FFmpeg binary not found. Ensure ffmpeg-static is installed correctly.')
  }

  return new Promise((resolve, reject) => {
    const args = ['-i', inputPath, '-ar', '16000', '-ac', '1', '-f', 'f32le', 'pipe:1']
    const proc = spawn(bin, args, { stdio: ['pipe', 'pipe', 'pipe'] })

    const chunks: Buffer[] = []
    let stderr = ''

    proc.stdout.on('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })

    proc.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString()
    })

    proc.on('error', (err) => {
      reject(new Error(`FFmpeg failed: ${err.message}`))
    })

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(parseFfmpegError(stderr)))
        return
      }
      resolve(Buffer.concat(chunks))
    })

    proc.stdin.end()
  })
}
