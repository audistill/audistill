import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

export function sanitizeElectronLaunchEnvironment(environment) {
  // Electron uses this sentinel to replace its desktop runtime with plain Node.
  // It can leak from parent agent/tooling processes into a nested dev launch.
  delete environment.ELECTRON_RUN_AS_NODE
}

async function main() {
  sanitizeElectronLaunchEnvironment(process.env)

  const require = createRequire(import.meta.url)
  const packagePath = require.resolve('electron-vite/package.json')
  const cliPath = resolve(dirname(packagePath), 'bin/electron-vite.js')
  await import(pathToFileURL(cliPath).href)
}

const entryPath = process.argv[1]
if (entryPath && resolve(entryPath) === fileURLToPath(import.meta.url)) {
  await main()
}
