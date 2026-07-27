import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getPath: () => '/unused' }
}))

import { DatabaseService } from '../src/main/database-service'

describe('DatabaseService', () => {
  let db: DatabaseService

  beforeEach(() => {
    db = new DatabaseService(':memory:')
  })

  afterEach(() => {
    db.close()
  })

  describe('schema creation', () => {
    it('creates all tables on init', () => {
      const episodes = db.getEpisodes()
      const folders = db.getFolders()
      const tabs = db.getOpenTabs()
      const setting = db.getSetting('nonexistent')

      expect(episodes).toEqual([])
      expect(folders).toEqual([])
      expect(tabs).toEqual([])
      expect(setting).toBeNull()
    })
  })

  describe('episode CRUD', () => {
    it('creates and reads an episode', () => {
      const id = db.createEpisode({ file_path: '/audio/test.mp3', title: 'Test Episode' })
      const episode = db.getEpisode(id)

      expect(episode).toBeDefined()
      expect(episode!.title).toBe('Test Episode')
      expect(episode!.file_path).toBe('/audio/test.mp3')
      expect(episode!.status).toBe('queued')
      expect(episode!.folder_id).toBeNull()
    })

    it('updates episode fields', () => {
      const id = db.createEpisode({ file_path: '/audio/test.mp3' })
      db.updateEpisode(id, { title: 'Updated', status: 'complete' })

      const episode = db.getEpisode(id)
      expect(episode!.title).toBe('Updated')
      expect(episode!.status).toBe('complete')
    })

    it('deletes an episode', () => {
      const id = db.createEpisode({ file_path: '/audio/test.mp3' })
      db.deleteEpisode(id)

      expect(db.getEpisode(id)).toBeUndefined()
    })

    it('lists episodes by folder (null = inbox)', () => {
      const folderId = db.createFolder('Podcasts')
      db.createEpisode({ file_path: '/a.mp3', folder_id: folderId })
      db.createEpisode({ file_path: '/b.mp3' })

      const inbox = db.getEpisodes(null)
      expect(inbox).toHaveLength(1)
      expect(inbox[0].file_path).toBe('/b.mp3')

      const folderEps = db.getEpisodes(folderId)
      expect(folderEps).toHaveLength(1)
      expect(folderEps[0].file_path).toBe('/a.mp3')

      const all = db.getEpisodes()
      expect(all).toHaveLength(2)
    })
  })

  describe('folder CRUD', () => {
    it('creates and reads folders', () => {
      const id = db.createFolder('My Folder')
      const folders = db.getFolders()

      expect(folders).toHaveLength(1)
      expect(folders[0].id).toBe(id)
      expect(folders[0].name).toBe('My Folder')
      expect(folders[0].parent_id).toBeNull()
    })

    it('updates folder name', () => {
      const id = db.createFolder('Old Name')
      db.updateFolder(id, { name: 'New Name' })

      const folders = db.getFolders()
      expect(folders[0].name).toBe('New Name')
    })

    it('deletes a folder', () => {
      const id = db.createFolder('To Delete')
      db.deleteFolder(id)

      expect(db.getFolders()).toHaveLength(0)
    })

    it('supports nested folders via parent_id', () => {
      const parentId = db.createFolder('Parent')
      const childId = db.createFolder('Child', parentId)

      const folders = db.getFolders()
      const child = folders.find((f) => f.id === childId)
      expect(child!.parent_id).toBe(parentId)
    })

    it('allows duplicate folder names', () => {
      db.createFolder('Same Name')
      db.createFolder('Same Name')

      expect(db.getFolders()).toHaveLength(2)
    })
  })

  describe('cascading behavior', () => {
    it('deleting a folder orphans episodes to inbox (folder_id → NULL)', () => {
      const folderId = db.createFolder('Folder')
      const epId = db.createEpisode({ file_path: '/test.mp3', folder_id: folderId })

      db.deleteFolder(folderId)

      const episode = db.getEpisode(epId)
      expect(episode!.folder_id).toBeNull()
    })

    it('deleting an episode removes its open_tabs entry', () => {
      const epId = db.createEpisode({ file_path: '/test.mp3' })
      db.saveOpenTabs([{ episode_id: epId, position: 0, is_preview: false }])

      expect(db.getOpenTabs()).toHaveLength(1)

      db.deleteEpisode(epId)
      expect(db.getOpenTabs()).toHaveLength(0)
    })
  })

  describe('tab persistence', () => {
    it('saves and loads open tabs', () => {
      const ep1 = db.createEpisode({ file_path: '/a.mp3' })
      const ep2 = db.createEpisode({ file_path: '/b.mp3' })

      db.saveOpenTabs([
        { episode_id: ep1, position: 0, is_preview: false },
        { episode_id: ep2, position: 1, is_preview: true }
      ])

      const tabs = db.getOpenTabs()
      expect(tabs).toHaveLength(2)
      expect(tabs[0].episode_id).toBe(ep1)
      expect(tabs[0].position).toBe(0)
      expect(tabs[0].is_preview).toBe(0)
      expect(tabs[1].episode_id).toBe(ep2)
      expect(tabs[1].is_preview).toBe(1)
    })

    it('saving tabs replaces all previous tabs', () => {
      const ep1 = db.createEpisode({ file_path: '/a.mp3' })
      const ep2 = db.createEpisode({ file_path: '/b.mp3' })

      db.saveOpenTabs([{ episode_id: ep1, position: 0, is_preview: false }])
      db.saveOpenTabs([{ episode_id: ep2, position: 0, is_preview: true }])

      const tabs = db.getOpenTabs()
      expect(tabs).toHaveLength(1)
      expect(tabs[0].episode_id).toBe(ep2)
    })
  })

  describe('settings', () => {
    it('get/set settings', () => {
      db.setSetting('api_key', 'sk-123')
      expect(db.getSetting('api_key')).toBe('sk-123')
    })

    it('overwrites existing setting', () => {
      db.setSetting('model', 'gpt-4')
      db.setSetting('model', 'gemini-flash')
      expect(db.getSetting('model')).toBe('gemini-flash')
    })

    it('returns null for missing setting', () => {
      expect(db.getSetting('nonexistent')).toBeNull()
    })
  })

  describe('search', () => {
    it('matches on title', () => {
      db.createEpisode({ file_path: '/a.mp3', title: 'Interview with Alice' })
      db.createEpisode({ file_path: '/b.mp3', title: 'Meeting notes' })

      const results = db.searchEpisodes('Alice')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Interview with Alice')
    })

    it('empty search returns all episodes', () => {
      db.createEpisode({ file_path: '/a.mp3', title: 'Ep 1' })
      db.createEpisode({ file_path: '/b.mp3', title: 'Ep 2' })

      const results = db.searchEpisodes('')
      expect(results).toHaveLength(2)
    })

    it('no match returns empty array', () => {
      db.createEpisode({ file_path: '/a.mp3', title: 'Ep 1' })
      expect(db.searchEpisodes('nonexistent')).toHaveLength(0)
    })

    it('matches on transcript content', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3', title: 'Ep 1' })
      db.updateEpisode(epId, { transcript: 'Discussion about quantum computing' })

      const results = db.searchEpisodes('quantum')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(epId)
    })

    it('deduplicates episodes when multiple tabs match', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3', title: 'Ep 1' })
      db.run(
        `INSERT INTO episode_tabs (id, episode_id, tab_name, content, position) VALUES (?, ?, ?, ?, ?)`,
        'tab1', epId, 'Brief', 'AI and machine learning overview', 0
      )
      db.run(
        `INSERT INTO episode_tabs (id, episode_id, tab_name, content, position) VALUES (?, ?, ?, ?, ?)`,
        'tab2', epId, 'Detailed', 'Detailed AI and machine learning analysis', 1
      )

      const results = db.searchEpisodes('machine learning')
      expect(results).toHaveLength(1)
      expect(results[0].id).toBe(epId)
    })

    it('episodes without tabs still appear when title matches', () => {
      db.createEpisode({ file_path: '/a.mp3', title: 'Quantum Physics Lecture' })

      const results = db.searchEpisodes('Quantum')
      expect(results).toHaveLength(1)
      expect(results[0].title).toBe('Quantum Physics Lecture')
    })

    it('matches across both title and tab content', () => {
      const ep1 = db.createEpisode({ file_path: '/a.mp3', title: 'Episode Alpha' })
      const ep2 = db.createEpisode({ file_path: '/b.mp3', title: 'Episode Beta' })
      db.run(
        `INSERT INTO episode_tabs (id, episode_id, tab_name, content, position) VALUES (?, ?, ?, ?, ?)`,
        'tab3', ep2, 'Full', 'This episode covers Alpha waves in the brain', 0
      )

      const results = db.searchEpisodes('Alpha')
      expect(results).toHaveLength(2)
    })
  })

  describe('episode_summaries CRUD', () => {
    it('creates a summary row', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      const sumId = db.createSummary(epId, 'brief')

      expect(sumId).toBeDefined()
      const summary = db.getSummary(epId, 'brief')
      expect(summary).toBeDefined()
      expect(summary!.episode_id).toBe(epId)
      expect(summary!.view_type).toBe('brief')
      expect(summary!.status).toBe('generating')
      expect(summary!.content).toBe('')
    })

    it('updates summary content and status', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'detailed')
      db.updateSummary(epId, 'detailed', { content: 'Some detailed content', status: 'complete' })

      const summary = db.getSummary(epId, 'detailed')
      expect(summary!.content).toBe('Some detailed content')
      expect(summary!.status).toBe('complete')
    })

    it('updates summary to error status', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'full')
      db.updateSummary(epId, 'full', { status: 'error', error_message: 'API failed' })

      const summary = db.getSummary(epId, 'full')
      expect(summary!.status).toBe('error')
      expect(summary!.error_message).toBe('API failed')
    })

    it('getSummaries returns all views for an episode', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'brief', 'complete')
      db.updateSummary(epId, 'brief', { content: 'Brief content', status: 'complete' })
      db.createSummary(epId, 'detailed', 'complete')
      db.updateSummary(epId, 'detailed', { content: 'Detailed content', status: 'complete' })

      const summaries = db.getSummaries(epId)
      expect(summaries).toHaveLength(2)
      expect(summaries.map((s) => s.view_type).sort()).toEqual(['brief', 'detailed'])
    })

    it('getSummary returns undefined for non-existent view', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      expect(db.getSummary(epId, 'full')).toBeUndefined()
    })

    it('enforces UNIQUE constraint on (episode_id, view_type)', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'brief')

      expect(() => db.createSummary(epId, 'brief')).toThrow()
    })

    it('cascading delete removes summaries when episode is deleted', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'brief')
      db.createSummary(epId, 'detailed')

      db.deleteEpisode(epId)

      expect(db.getSummaries(epId)).toHaveLength(0)
    })

    it('status transitions: generating → complete', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'brief')

      let summary = db.getSummary(epId, 'brief')
      expect(summary!.status).toBe('generating')

      db.updateSummary(epId, 'brief', { content: 'Done', status: 'complete' })
      summary = db.getSummary(epId, 'brief')
      expect(summary!.status).toBe('complete')
    })

    it('status transitions: generating → error', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'brief')

      db.updateSummary(epId, 'brief', { status: 'error', error_message: 'Timeout' })
      const summary = db.getSummary(epId, 'brief')
      expect(summary!.status).toBe('error')
      expect(summary!.error_message).toBe('Timeout')
    })

    it('allows different view types for the same episode', () => {
      const epId = db.createEpisode({ file_path: '/a.mp3' })
      db.createSummary(epId, 'brief')
      db.createSummary(epId, 'detailed')
      db.createSummary(epId, 'full')

      expect(db.getSummaries(epId)).toHaveLength(3)
    })
  })
})
