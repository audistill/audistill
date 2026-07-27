import { beforeEach, describe, expect, it } from 'vitest'
import { useRecordingPrototypeStore } from './recording-panel-prototype-store'

// PROTOTYPE — THROWAWAY

describe('recording panel prototype store', () => {
  beforeEach(() => {
    useRecordingPrototypeStore.getState().reset()
  })

  it('starts only when at least one enabled source has simulated permission', () => {
    const state = useRecordingPrototypeStore.getState()
    state.setPermissionDenied('system', true)
    state.setPermissionDenied('microphone', true)

    useRecordingPrototypeStore.getState().start()
    expect(useRecordingPrototypeStore.getState().phase).toBe('setup')

    useRecordingPrototypeStore.getState().setPermissionDenied('microphone', false)
    useRecordingPrototypeStore.getState().start()
    expect(useRecordingPrototypeStore.getState().phase).toBe('recording')
  })

  it('keeps a disconnected microphone disconnected through pause and resume', () => {
    const state = useRecordingPrototypeStore.getState()
    state.disconnectMicrophone()
    state.pause()

    expect(useRecordingPrototypeStore.getState()).toMatchObject({
      phase: 'paused',
      microphoneDisconnected: true
    })

    useRecordingPrototypeStore.getState().resume()
    expect(useRecordingPrototypeStore.getState()).toMatchObject({
      phase: 'disconnected',
      microphoneDisconnected: true
    })

    useRecordingPrototypeStore.getState().replaceMicrophone()
    expect(useRecordingPrototypeStore.getState()).toMatchObject({
      phase: 'recording',
      microphoneDisconnected: false
    })
  })

  it('replaces a disconnected microphone without unpausing', () => {
    const state = useRecordingPrototypeStore.getState()
    state.disconnectMicrophone()
    state.pause()
    state.replaceMicrophone()

    expect(useRecordingPrototypeStore.getState()).toMatchObject({
      phase: 'paused',
      microphoneDisconnected: false
    })
  })
})
