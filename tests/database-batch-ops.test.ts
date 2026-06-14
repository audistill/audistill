import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DatabaseService } from '../src/main/database-service'

vi.mock('electron', () => ({
  app: { getPath: () => '/tmp' },
}))

describe('DatabaseService — batch operations', () => {
  let db: DatabaseService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
  })

  describe('moveEpisodes', () => {
    it('moves multiple episodes to a folder atomically', () => {
      const folderId = db.createFolder('Work')
      const ep1 = db.createEpisode({ title: 'Episode 1' })
      const ep2 = db.createEpisode({ title: 'Episode 2' })
      const ep3 = db.createEpisode({ title: 'Episode 3' })

      db.moveEpisodes([ep1, ep2], folderId)

      expect(db.getEpisode(ep1)!.folder_id).toBe(folderId)
      expect(db.getEpisode(ep2)!.folder_id).toBe(folderId)
      expect(db.getEpisode(ep3)!.folder_id).toBeNull()
    })

    it('moves episodes to Inbox when folderId is null', () => {
      const folderId = db.createFolder('Work')
      const ep1 = db.createEpisode({ title: 'Episode 1', folder_id: folderId })
      const ep2 = db.createEpisode({ title: 'Episode 2', folder_id: folderId })

      db.moveEpisodes([ep1, ep2], null)

      expect(db.getEpisode(ep1)!.folder_id).toBeNull()
      expect(db.getEpisode(ep2)!.folder_id).toBeNull()
    })

    it('empty array is a no-op', () => {
      const ep1 = db.createEpisode({ title: 'Episode 1' })

      db.moveEpisodes([], 'some-folder-id')

      expect(db.getEpisode(ep1)!.folder_id).toBeNull()
    })
  })

  describe('deleteEpisodes', () => {
    it('deletes multiple episodes atomically', () => {
      const ep1 = db.createEpisode({ title: 'Episode 1' })
      const ep2 = db.createEpisode({ title: 'Episode 2' })
      const ep3 = db.createEpisode({ title: 'Episode 3' })

      db.deleteEpisodes([ep1, ep2])

      expect(db.getEpisode(ep1)).toBeUndefined()
      expect(db.getEpisode(ep2)).toBeUndefined()
      expect(db.getEpisode(ep3)).toBeDefined()
    })

    it('empty array is a no-op', () => {
      const ep1 = db.createEpisode({ title: 'Episode 1' })

      db.deleteEpisodes([])

      expect(db.getEpisode(ep1)).toBeDefined()
    })

    it('does not affect unspecified episodes', () => {
      const ep1 = db.createEpisode({ title: 'Episode 1' })
      const ep2 = db.createEpisode({ title: 'Episode 2' })
      const ep3 = db.createEpisode({ title: 'Episode 3' })

      db.deleteEpisodes([ep2])

      expect(db.getEpisode(ep1)).toBeDefined()
      expect(db.getEpisode(ep2)).toBeUndefined()
      expect(db.getEpisode(ep3)).toBeDefined()
    })
  })
})
