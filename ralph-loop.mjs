#!/usr/bin/env node
import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { execSync } from 'node:child_process'

const GRAY = '\x1b[90m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const RED = '\x1b[31m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'
const CYAN = '\x1b[36m'

function log(color, prefix, msg) {
  const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
  console.log(`${GRAY}${ts}${RESET} ${color}${prefix}${RESET} ${msg}`)
}

function isDirty() {
  try {
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim()
    return status.length > 0
  } catch {
    return false
  }
}

function parseIssuePicked(text) {
  const match = text.match(/status.*['"]?in-progress['"]?/i)
  if (match) return true
  return false
}

async function runIteration(iterNum) {
  const start = Date.now()
  let issueFound = null
  let complete = false
  let failed = false
  let fullText = ''

  return new Promise((resolve) => {
    const proc = spawn('claude', [
      '-p',
      '@ralph-prompt.md',
      '--permission-mode', 'acceptEdits',
      '--output-format', 'stream-json',
      '--verbose',
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
    })

    const rl = createInterface({ input: proc.stdout })

    rl.on('line', (line) => {
      if (!line.trim()) return

      let event
      try {
        event = JSON.parse(line)
      } catch {
        return
      }

      if (event.type === 'assistant' && event.message?.content) {
        for (const block of event.message.content) {
          if (block.type === 'text' && block.text) {
            fullText += block.text
            process.stdout.write(`${GRAY}${block.text}${RESET}`)
          }
          if (block.type === 'tool_use') {
            const target = block.input?.file_path || block.input?.command?.slice(0, 60) || ''
            log(CYAN, '  ▶', `${block.name} ${target}`)
          }
        }
      }

      if (event.type === 'result') {
        if (event.result) fullText += event.result
        if (event.is_error) failed = true
      }
    })

    proc.stderr.on('data', (data) => {
      const msg = data.toString().trim()
      if (msg) log(YELLOW, '  ⚠', msg)
    })

    proc.on('close', (code) => {
      const duration = ((Date.now() - start) / 1000).toFixed(1)

      if (fullText.includes('<promise>COMPLETE</promise>')) {
        complete = true
      }

      if (code !== 0 && !complete) {
        failed = true
      }

      const issueMatch = fullText.match(/in-progress.*?([a-z0-9-]+)\/issue\.md/i)
        || fullText.match(/\.scratch\/([a-z0-9-]+)/i)
      if (issueMatch) issueFound = issueMatch[1]

      console.log('')
      if (complete) {
        log(GREEN, '✓', `All issues complete (${duration}s)`)
      } else if (failed) {
        log(RED, '✗', `Iteration ${iterNum} failed${issueFound ? ` (${issueFound})` : ''} — ${duration}s`)
      } else {
        log(GREEN, '✓', `Iteration ${iterNum} done${issueFound ? ` (${issueFound})` : ''} — ${duration}s`)
      }

      resolve({ complete, failed, issueFound, duration })
    })
  })
}

async function main() {
  console.log(`${BOLD}ralph-loop${RESET} — continuous agent mode`)
  console.log(`${GRAY}permission-mode: acceptEdits | session: fresh each iteration${RESET}`)
  console.log('')

  let iteration = 0

  while (true) {
    iteration++

    if (isDirty()) {
      log(RED, '⚠', 'Working tree is dirty — stopping loop to avoid compounding changes.')
      log(YELLOW, ' ', 'Commit or stash changes, then re-run.')
      process.exit(1)
    }

    log(BOLD, `━━━`, `Iteration ${iteration}`)

    const result = await runIteration(iteration)

    if (result.complete) {
      log(GREEN, '🏁', `All issues done after ${iteration} iteration(s).`)
      break
    }

    if (result.failed) {
      log(YELLOW, '→', 'Continuing to next iteration...')
    }

    console.log('')
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
