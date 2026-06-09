import { DatabaseService, EpisodeSummary } from './database-service'
import { RecipeService } from './recipe-service'
import { TabService } from './tab-service'

interface CanvasRow {
  episode_id: string
  content: string
}

export class MigrationService {
  private db: DatabaseService
  private recipeService: RecipeService
  private tabService: TabService

  constructor(db: DatabaseService, recipeService: RecipeService, tabService: TabService) {
    this.db = db
    this.recipeService = recipeService
    this.tabService = tabService
  }

  run(): void {
    this.migrateSettings()
    this.migrateSummariesAndCanvas()
    this.dropOldTables()
  }

  private migrateSettings(): void {
    const modelFast = this.db.getSetting('model_fast')
    if (modelFast) {
      const briefRecipe = this.recipeService.getRecipes().find((r) => r.name === 'Brief' && r.is_builtin)
      if (briefRecipe && !briefRecipe.model_override) {
        this.recipeService.updateRecipe(briefRecipe.id, { model_override: modelFast })
      }
    }

    const modelQuality = this.db.getSetting('model_quality')
    if (modelQuality) {
      this.db.setSetting('default_model', modelQuality)
    }
  }

  private migrateSummariesAndCanvas(): void {
    if (!this.tableExists('episode_summaries') && !this.tableExists('episode_canvas')) {
      return
    }

    const recipes = this.recipeService.getRecipes()
    const briefRecipe = recipes.find((r) => r.name === 'Brief' && r.is_builtin)
    const detailedRecipe = recipes.find((r) => r.name === 'Detailed' && r.is_builtin)
    const fullRecipe = recipes.find((r) => r.name === 'Full' && r.is_builtin)

    const episodes = this.db.getEpisodes()

    for (const episode of episodes) {
      const existingTabs = this.tabService.getTabs(episode.id)
      if (existingTabs.length > 0) continue

      let position = 0

      if (this.tableExists('episode_summaries')) {
        const summaries = this.db.queryAll<EpisodeSummary>(
          'SELECT * FROM episode_summaries WHERE episode_id = ? AND status = ?',
          episode.id, 'complete'
        )

        const brief = summaries.find((s) => s.view_type === 'brief' && s.content)
        if (brief && brief.content) {
          this.db.run(
            `INSERT INTO episode_tabs (id, episode_id, recipe_id, tab_name, content, is_pipeline, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 1, ?, datetime('now'), datetime('now'))`,
            brief.id, episode.id, briefRecipe?.id ?? null, 'Brief', brief.content, position
          )
          position++
        }

        const detailed = summaries.find((s) => s.view_type === 'detailed' && s.content)
        if (detailed && detailed.content) {
          this.db.run(
            `INSERT INTO episode_tabs (id, episode_id, recipe_id, tab_name, content, is_pipeline, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`,
            detailed.id, episode.id, detailedRecipe?.id ?? null, 'Detailed Notes', detailed.content, position
          )
          position++
        }

        const full = summaries.find((s) => s.view_type === 'full' && s.content)
        if (full && full.content) {
          this.db.run(
            `INSERT INTO episode_tabs (id, episode_id, recipe_id, tab_name, content, is_pipeline, position, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, 0, ?, datetime('now'), datetime('now'))`,
            full.id, episode.id, fullRecipe?.id ?? null, 'Full Notes', full.content, position
          )
          position++
        }
      }

      if (this.tableExists('episode_canvas')) {
        const canvas = this.db.queryOne<CanvasRow>(
          'SELECT episode_id, content FROM episode_canvas WHERE episode_id = ?',
          episode.id
        )
        if (canvas && canvas.content) {
          this.db.run(
            `INSERT INTO episode_tabs (id, episode_id, recipe_id, tab_name, content, is_pipeline, position, created_at, updated_at)
             VALUES (?, ?, NULL, ?, ?, 0, ?, datetime('now'), datetime('now'))`,
            `canvas-${episode.id}`, episode.id, 'Canvas', canvas.content, position
          )
        }
      }
    }
  }

  private dropOldTables(): void {
    if (this.tableExists('episode_summaries')) {
      this.db.exec('DROP TABLE episode_summaries')
    }
    if (this.tableExists('episode_canvas')) {
      this.db.exec('DROP TABLE episode_canvas')
    }
  }

  private tableExists(tableName: string): boolean {
    const row = this.db.queryOne<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
      tableName
    )
    return !!row
  }
}
