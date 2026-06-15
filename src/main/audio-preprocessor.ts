import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { extname } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { app } from 'electron'
import { SUPPORTED_EXTENSIONS } from '../shared/supported-formats'

function resolveFFmpegBin(): string | null {
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
