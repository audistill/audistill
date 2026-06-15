import { resolve } from 'path'
import { cpSync } from 'fs'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

function copyPrompts() {
  return {
    name: 'copy-prompts',
    closeBundle() {
      cpSync(resolve('src/main/prompts'), resolve('out/main/prompts'), { recursive: true })
    }
  }
}

export default defineConfig({
  main: {
    define: {
      __OFFICIAL_BUILD__: JSON.stringify(process.env.OFFICIAL_BUILD === 'true')
    },
    plugins: [copyPrompts()],
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/main/index.ts'),
          'transcription-worker': resolve('src/main/transcription-worker.ts')
        },
        external: ['onnxruntime-node', 'ffmpeg-static', 'better-sqlite3']
      }
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
