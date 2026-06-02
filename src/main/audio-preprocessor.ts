import { execFile } from 'node:child_process'
import { access } from 'node:fs/promises'
import { extname } from 'node:path'
import ffmpegPath from 'ffmpeg-static'

const SUPPORTED_EXTENSIONS = new Set(['.mp3', '.m4a', '.wav', '.flac', '.mp4'])

export async function preprocess(inputPath: string): Promise<Buffer> {
  const ext = extname(inputPath).toLowerCase()

  if (!SUPPORTED_EXTENSIONS.has(ext)) {
    throw new Error(
      `Unsupported file format "${ext}". Supported formats: MP3, M4A, WAV, FLAC, MP4.`
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

    const proc = execFile(bin, args, { encoding: 'buffer', maxBuffer: 500 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(new Error(`FFmpeg failed: ${error.message}`))
        return
      }
      resolve(stdout)
    })

    proc.stdin?.end()
  })
}
