import { existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { isAbsolute, join, relative, resolve } from 'node:path'
import type { DatabaseService, Episode } from './database-service'
import {
  readAndValidateRecordingManifest,
  type FinalizedRecording,
} from './recording-session-coordinator'

export interface RecordingRecoveryEntry {
  id: string
  recording: FinalizedRecording
  correlatedEpisodeId: string | null
}

export function reconcileRecordingSessions(
  recordingsDirectory: string,
  db: DatabaseService,
): RecordingRecoveryEntry[] {
  mkdirSync(recordingsDirectory, { recursive: true })
  const episodes = db.getEpisodes().filter((episode) => episode.source_type === 'recorded')
  const handledEpisodeIds = new Set<string>()
  const candidates: RecordingRecoveryEntry[] = []

  for (const item of readdirSync(recordingsDirectory, { withFileTypes: true })) {
    if (!item.isDirectory()) continue
    const sessionDirectory = join(recordingsDirectory, item.name)
    const manifestPath = join(sessionDirectory, 'manifest.json')
    try {
      const recording = readAndValidateRecordingManifest(manifestPath)
      const matchingEpisodes = episodes.filter((episode) =>
        episode.file_path === manifestPath || recordingMetadataMatches(episode, recording),
      )
      for (const episode of matchingEpisodes) handledEpisodeIds.add(episode.id)

      const completedEpisode = matchingEpisodes.find((episode) => Boolean(episode.transcript))
      const discardedEpisode = matchingEpisodes.find(recordingWasDiscarded)
      if (completedEpisode || discardedEpisode) {
        if (removeDirectory(sessionDirectory)) {
          for (const episode of matchingEpisodes) db.updateEpisode(episode.id, { file_path: null })
        }
        continue
      }

      const correlatedEpisode = matchingEpisodes[0]
      if (correlatedEpisode) {
        db.updateEpisode(correlatedEpisode.id, {
          file_path: manifestPath,
          status: 'recovery-pending',
          error_message: 'Captured audio is waiting for recovery.',
        })
        for (const duplicate of matchingEpisodes.slice(1)) {
          db.updateEpisode(duplicate.id, {
            file_path: null,
            status: 'cancelled',
            error_message: 'Duplicate recording ownership was removed during recovery.',
          })
        }
      }
      candidates.push({
        id: recording.manifest.sessionId,
        recording,
        correlatedEpisodeId: correlatedEpisode?.id ?? null,
      })
    } catch {
      removeDirectory(sessionDirectory)
    }
  }

  for (const episode of episodes) {
    if (handledEpisodeIds.has(episode.id) || !episode.file_path || !isWithin(recordingsDirectory, episode.file_path)) continue
    db.updateEpisode(episode.id, {
      file_path: null,
      status: episode.transcript ? episode.status : 'cancelled',
      error_message: episode.transcript ? episode.error_message : 'Captured audio was unavailable and could not be recovered.',
    })
  }

  return candidates.sort((left, right) =>
    Date.parse(left.recording.manifest.startedAt) - Date.parse(right.recording.manifest.startedAt),
  )
}

function recordingMetadataMatches(episode: Episode, recording: FinalizedRecording): boolean {
  if (!episode.source_meta) return false
  try {
    const meta = JSON.parse(episode.source_meta) as { captureSessionId?: unknown; recordedAt?: unknown }
    if (typeof meta.captureSessionId === 'string') return meta.captureSessionId === recording.manifest.sessionId
    return meta.recordedAt === recording.manifest.startedAt
  } catch {
    return false
  }
}

function recordingWasDiscarded(episode: Episode): boolean {
  if (!episode.source_meta) return false
  try {
    return (JSON.parse(episode.source_meta) as { recordingDiscarded?: unknown }).recordingDiscarded === true
  } catch {
    return false
  }
}

function removeDirectory(directory: string): boolean {
  try {
    rmSync(directory, { recursive: true, force: true })
    return !existsSync(directory)
  } catch {
    return false
  }
}

function isWithin(directory: string, candidate: string): boolean {
  if (!isAbsolute(candidate)) return false
  const fromDirectory = relative(resolve(directory), resolve(candidate))
  return fromDirectory !== '' && !fromDirectory.startsWith('..') && !isAbsolute(fromDirectory)
}
