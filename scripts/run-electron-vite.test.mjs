import { describe, expect, it } from 'vitest'
import { sanitizeElectronLaunchEnvironment } from './run-electron-vite.mjs'

describe('Electron launch environment', () => {
  it('removes ELECTRON_RUN_AS_NODE without changing unrelated variables', () => {
    const environment = {
      ELECTRON_RUN_AS_NODE: '1',
      KEEP_ME: 'yes',
    }

    sanitizeElectronLaunchEnvironment(environment)

    expect(environment).toEqual({ KEEP_ME: 'yes' })
  })
})
