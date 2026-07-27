export type UpdateStatus =
  | { state: 'idle'; currentVersion: string }
  | { state: 'checking'; currentVersion: string }
  | { state: 'downloading'; percent: number; currentVersion: string }
  | { state: 'ready'; version: string; currentVersion: string }
  | { state: 'error'; currentVersion: string }
