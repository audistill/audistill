import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    define: {
      __OFFICIAL_BUILD__: JSON.stringify(process.env.OFFICIAL_BUILD === 'true')
    },
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
