import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import { extname } from 'node:path'
import ffmpegPath from 'ffmpeg-static'
import { SUPPORTED_EXTENSIONS } from '../shared/supported-formats'

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

  if (!ffmpegPath) {
    throw new Error('FFmpeg binary not found. Ensure ffmpeg-static is installed correctly.')
  }

  const bin = ffmpegPath

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
        reject(new Error(`FFmpeg failed (exit ${code}): ${stderr.slice(-500)}`))
        return
      }
      resolve(Buffer.concat(chunks))
    })

    proc.stdin.end()
  })
}
