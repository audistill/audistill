import { mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'

if (process.platform !== 'darwin') process.exit(0)

const source = resolve('native/macos-capture-helper/main.swift')
const outputDirectory = resolve('build/native')
const output = resolve(outputDirectory, 'audistill-capture-helper')
mkdirSync(outputDirectory, { recursive: true })

const result = spawnSync('xcrun', [
  'swiftc',
  source,
  '-O',
  '-target',
  'arm64-apple-macos13.0',
  '-framework', 'AVFoundation',
  '-framework', 'CoreMedia',
  '-framework', 'ScreenCaptureKit',
  '-o', output,
], { stdio: 'inherit' })

if (result.status !== 0) process.exit(result.status ?? 1)
