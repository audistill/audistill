import { describe, expect, it } from 'vitest'
import { normalizeAudioActivityLevel, resolveRecordingSourcePermission } from './native-recording-capture-backend'
import type { RecordingSource } from '../shared/recording-session'

describe('resolveRecordingSourcePermission', () => {
  const systemAudio: RecordingSource = {
    id: 'system-audio',
    kind: 'system-audio',
    name: 'System Audio',
    detail: 'Screen Recording access is required',
    readiness: 'denied',
    activity: 0,
  }

  it('offers a native permission request before treating absent ScreenCapture access as denied', () => {
    expect(resolveRecordingSourcePermission(systemAudio, 'denied', false).readiness).toBe('permission-not-determined')
  })

  it('refreshes System Audio to ready after ScreenCapture access is granted', () => {
    expect(resolveRecordingSourcePermission({ ...systemAudio, readiness: 'ready' }, 'granted', true).readiness).toBe('ready')
  })

  it('treats ScreenCapture access as denied after a native request was declined', () => {
    expect(resolveRecordingSourcePermission(systemAudio, 'denied', true).readiness).toBe('denied')
  })
})

describe('normalizeAudioActivityLevel', () => {
  it('maps linear RMS activity onto a perceptual decibel meter range', () => {
    expect(normalizeAudioActivityLevel(0)).toBe(0)
    expect(normalizeAudioActivityLevel(0.001)).toBe(0)
    expect(normalizeAudioActivityLevel(0.01)).toBeCloseTo(1 / 3)
    expect(normalizeAudioActivityLevel(0.1)).toBeCloseTo(2 / 3)
    expect(normalizeAudioActivityLevel(1)).toBe(1)
  })
})
