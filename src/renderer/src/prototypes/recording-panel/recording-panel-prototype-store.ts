import { create } from 'zustand'

// PROTOTYPE — THROWAWAY

export type RecordingPrototypePhase =
  | 'setup'
  | 'recording'
  | 'paused'
  | 'disconnected'
  | 'preparing'

export type RecordingPrototypeWorkspace = 'recording' | 'episode'
export type RecordingPrototypeSource = 'system' | 'microphone'

interface RecordingPrototypeState {
  phase: RecordingPrototypePhase
  workspace: RecordingPrototypeWorkspace
  elapsedSeconds: number
  title: string
  systemAudioEnabled: boolean
  microphoneEnabled: boolean
  microphoneName: string
  microphoneDisconnected: boolean
  systemAudioPermissionDenied: boolean
  microphonePermissionDenied: boolean
  setPhase: (phase: RecordingPrototypePhase) => void
  setWorkspace: (workspace: RecordingPrototypeWorkspace) => void
  setTitle: (title: string) => void
  setSystemAudioEnabled: (enabled: boolean) => void
  setMicrophoneEnabled: (enabled: boolean) => void
  setPermissionDenied: (source: RecordingPrototypeSource, denied: boolean) => void
  start: () => void
  pause: () => void
  resume: () => void
  stop: () => void
  disconnectMicrophone: () => void
  replaceMicrophone: () => void
  cancel: () => void
  tick: () => void
  reset: () => void
}

const initialState = {
  phase: 'setup' as const,
  workspace: 'recording' as const,
  elapsedSeconds: 0,
  title: 'Weekly product sync',
  systemAudioEnabled: true,
  microphoneEnabled: true,
  microphoneName: 'MacBook Pro Microphone',
  microphoneDisconnected: false,
  systemAudioPermissionDenied: false,
  microphonePermissionDenied: false
}

export const useRecordingPrototypeStore = create<RecordingPrototypeState>((set) => ({
  ...initialState,
  setPhase: (phase) =>
    set(
      phase === 'disconnected'
        ? {
            phase,
            systemAudioEnabled: true,
            microphoneEnabled: true,
            microphoneDisconnected: true
          }
        : phase === 'setup'
          ? { phase, microphoneDisconnected: false }
          : { phase }
    ),
  setWorkspace: (workspace) => set({ workspace }),
  setTitle: (title) => set({ title }),
  setSystemAudioEnabled: (systemAudioEnabled) =>
    set((state) =>
      state.microphoneDisconnected && !systemAudioEnabled ? state : { systemAudioEnabled }
    ),
  setMicrophoneEnabled: (microphoneEnabled) => set({ microphoneEnabled }),
  setPermissionDenied: (source, denied) =>
    set(
      source === 'system'
        ? { systemAudioPermissionDenied: denied }
        : { microphonePermissionDenied: denied }
    ),
  start: () =>
    set((state) =>
      (state.systemAudioEnabled && !state.systemAudioPermissionDenied) ||
      (state.microphoneEnabled &&
        !state.microphonePermissionDenied &&
        !state.microphoneDisconnected)
        ? { phase: 'recording' }
        : state
    ),
  pause: () => set({ phase: 'paused' }),
  resume: () =>
    set((state) => ({ phase: state.microphoneDisconnected ? 'disconnected' : 'recording' })),
  stop: () => set({ phase: 'preparing' }),
  disconnectMicrophone: () =>
    set({
      phase: 'disconnected',
      systemAudioEnabled: true,
      microphoneEnabled: true,
      microphoneDisconnected: true
    }),
  replaceMicrophone: () =>
    set((state) => ({
      microphoneDisconnected: false,
      phase: state.phase === 'disconnected' ? 'recording' : state.phase
    })),
  cancel: () => set({ ...initialState }),
  tick: () =>
    set((state) =>
      state.phase === 'recording' || state.phase === 'disconnected'
        ? { elapsedSeconds: state.elapsedSeconds + 1 }
        : state
    ),
  reset: () => set({ ...initialState })
}))
