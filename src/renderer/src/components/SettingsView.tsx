import { useState, useEffect, useRef, useCallback } from 'react'
import { useOpenRouterModels, type ModelOption } from '../lib/use-openrouter-models'

interface Recipe {
  id: string
  name: string
  prompt: string
  model_override: string | null
  is_builtin: number
  sort_order: number
  created_at: string
}

function ModelPicker({
  label,
  subtitle,
  value,
  onChange,
  models,
  placeholder,
}: {
  label?: string
  subtitle?: string
  value: string
  onChange: (value: string) => void
  models: ModelOption[]
  placeholder?: string
}): React.JSX.Element {
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = models.length > 0
    ? models.filter((m) => {
        if (!filter) return true
        const lower = filter.toLowerCase()
        return m.id.toLowerCase().includes(lower) || (m.name && m.name.toLowerCase().includes(lower))
      })
    : []

  return (
    <div className={label ? 'mb-8' : ''}>
      {label && <label className="block font-heading text-sm font-medium text-[var(--text)] mb-0.5">{label}</label>}
      {subtitle && <p className="text-xs text-[var(--secondary)] mb-2">{subtitle}</p>}
      <div className="relative w-full max-w-lg" ref={ref}>
        <input
          type="text"
          value={open ? filter : value || ''}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={() => {
            setOpen(true)
            setFilter('')
          }}
          className="w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
          placeholder={placeholder ?? 'Search models...'}
        />
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-[10px] bg-[var(--bg)] border border-[var(--surface)] shadow-xl z-50">
            {filtered.length > 0 ? (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onChange(m.id)
                    setOpen(false)
                    setFilter('')
                  }}
                  className={`w-full text-left px-4 py-2 text-sm truncate hover:bg-[var(--surface)] transition-colors ${
                    m.id === value ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                  }`}
                >
                  {m.id}
                </button>
              ))
            ) : (
              <p className="px-4 py-2 text-sm text-[var(--secondary)]">
                {models.length === 0 ? 'Loading models...' : 'No models found'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function RecipeRow({
  recipe,
  expanded,
  onToggle,
  onUpdate,
  onDuplicate,
  onDelete,
  models,
}: {
  recipe: Recipe
  expanded: boolean
  onToggle: () => void
  onUpdate: (fields: Partial<Pick<Recipe, 'name' | 'prompt' | 'model_override'>>) => void
  onDuplicate: () => void
  onDelete: () => void
  models: ModelOption[]
}): React.JSX.Element {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const nameRef = useRef<HTMLInputElement>(null)
  const promptRef = useRef<HTMLTextAreaElement>(null)

  const handleNameBlur = useCallback(() => {
    const val = nameRef.current?.value
    if (val !== undefined && val !== recipe.name) {
      onUpdate({ name: val })
    }
  }, [recipe.name, onUpdate])

  const handlePromptBlur = useCallback(() => {
    const val = promptRef.current?.value
    if (val !== undefined && val !== recipe.prompt) {
      onUpdate({ prompt: val })
    }
  }, [recipe.prompt, onUpdate])

  return (
    <div className="border border-[var(--surface)] rounded-[12px] overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--surface)] transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-3.5 h-3.5 text-[var(--secondary)] transition-transform ${expanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-[var(--text)]">{recipe.name}</span>
          {recipe.is_builtin === 1 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded bg-[var(--accent)]/10 text-[var(--accent)] font-medium">
              built-in
            </span>
          )}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 border-t border-[var(--surface)]">
          <div className="pt-4 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--secondary)] mb-1">Name</label>
              <input
                ref={nameRef}
                type="text"
                defaultValue={recipe.name}
                onBlur={handleNameBlur}
                className="w-full max-w-sm px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--secondary)] mb-1">Prompt</label>
              <textarea
                ref={promptRef}
                rows={6}
                defaultValue={recipe.prompt}
                onBlur={handlePromptBlur}
                className="w-full px-3 py-2 rounded-[8px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors resize-y font-mono"
              />
            </div>

            <div>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-1 text-xs text-[var(--secondary)] hover:text-[var(--text)] transition-colors"
              >
                <svg
                  className={`w-3 h-3 transition-transform ${showAdvanced ? 'rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                Advanced
              </button>
              {showAdvanced && (
                <div className="mt-2">
                  <label className="block text-xs font-medium text-[var(--secondary)] mb-1">Model Override</label>
                  <div className="max-w-sm">
                    <ModelPicker
                      value={recipe.model_override || ''}
                      onChange={(val) => onUpdate({ model_override: val || null })}
                      models={[{ id: '', name: 'Use default model' }, ...models]}
                      placeholder="Use default model..."
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onDuplicate}
                className="px-3 py-1.5 text-xs rounded-[8px] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--accent)]/10 hover:text-[var(--accent)] transition-colors"
              >
                Duplicate
              </button>
              {recipe.is_builtin !== 1 && (
                <button
                  onClick={onDelete}
                  className="px-3 py-1.5 text-xs rounded-[8px] bg-[var(--surface)] text-red-400 hover:bg-red-400/10 transition-colors"
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export function SettingsView(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [defaultModel, setDefaultModel] = useState('google/gemini-3.5-flash')
  const [pipelineRecipeId, setPipelineRecipeId] = useState('')
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [ytdlpPath, setYtdlpPath] = useState('')
  const [ytdlpCustomArgs, setYtdlpCustomArgs] = useState('')

  const models = useOpenRouterModels()

  useEffect(() => {
    Promise.all([
      window.api.getSetting('openrouter_api_key'),
      window.api.getSetting('model_quality'),
      window.api.getSetting('pipeline_recipe_id'),
      window.api.recipesGetAll(),
      window.api.getSetting('ytdlp_path'),
      window.api.getSetting('ytdlp_custom_args'),
    ]).then(([key, savedModel, savedPipelineId, allRecipes, savedYtdlpPath, savedYtdlpArgs]) => {
      if (key) setApiKey(key)
      if (savedModel) setDefaultModel(savedModel)
      if (savedPipelineId) setPipelineRecipeId(savedPipelineId)
      setRecipes(allRecipes)
      if (savedYtdlpPath) setYtdlpPath(savedYtdlpPath)
      if (savedYtdlpArgs) setYtdlpCustomArgs(savedYtdlpArgs)
      setLoaded(true)
    })
  }, [])

  const saveApiKey = (value: string): void => {
    setApiKey(value)
    window.api.setSetting('openrouter_api_key', value)
  }

  const saveDefaultModel = (value: string): void => {
    setDefaultModel(value)
    window.api.setSetting('model_quality', value)
  }

  const savePipelineRecipe = (value: string): void => {
    setPipelineRecipeId(value)
    window.api.setSetting('pipeline_recipe_id', value)
  }

  const handleRecipeUpdate = useCallback((id: string, fields: Partial<Pick<Recipe, 'name' | 'prompt' | 'model_override'>>) => {
    window.api.recipesUpdate(id, fields)
    setRecipes((prev) => prev.map((r) => r.id === id ? { ...r, ...fields } : r))
  }, [])

  const handleRecipeDuplicate = useCallback(async (recipe: Recipe) => {
    const newId = await window.api.recipesCreate({
      name: `${recipe.name} (copy)`,
      prompt: recipe.prompt,
      model_override: recipe.model_override || undefined,
    })
    const allRecipes = await window.api.recipesGetAll()
    setRecipes(allRecipes)
    setExpandedId(newId)
  }, [])

  const handleRecipeDelete = useCallback(async (id: string) => {
    await window.api.recipesDelete(id)
    setRecipes((prev) => prev.filter((r) => r.id !== id))
    if (expandedId === id) setExpandedId(null)
    if (pipelineRecipeId === id) {
      const remaining = recipes.filter((r) => r.id !== id)
      if (remaining.length > 0) {
        savePipelineRecipe(remaining[0].id)
      }
    }
  }, [expandedId, pipelineRecipeId, recipes])

  const handleNewRecipe = useCallback(async () => {
    const newId = await window.api.recipesCreate({
      name: 'New Template',
      prompt: '',
    })
    const allRecipes = await window.api.recipesGetAll()
    setRecipes(allRecipes)
    setExpandedId(newId)
  }, [])

  if (!loaded) return <div />

  return (
    <div className="flex-1 overflow-y-auto px-12 py-8">
      <h1 className="font-heading text-2xl font-semibold text-[var(--text)] mb-8">Settings</h1>

      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">OpenRouter API Key</label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => saveApiKey(e.target.value)}
          className="w-full max-w-lg px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
          placeholder="sk-or-v1-..."
        />
        <p className="text-xs text-[var(--secondary)] mt-1.5">
          Your API key is stored locally and never sent anywhere except OpenRouter.
        </p>
      </div>

      <ModelPicker
        label="Default Model"
        subtitle="Used for all recipes unless overridden per-template"
        value={defaultModel}
        onChange={saveDefaultModel}
        models={models}
      />

      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-0.5">Pipeline Template</label>
        <p className="text-xs text-[var(--secondary)] mb-2">
          This template auto-runs when you import new audio.
        </p>
        <select
          value={pipelineRecipeId}
          onChange={(e) => savePipelineRecipe(e.target.value)}
          className="w-full max-w-lg px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors appearance-none"
        >
          {recipes.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-0.5">YouTube Import</label>
        <p className="text-xs text-[var(--secondary)] mb-3">
          Configure yt-dlp for importing audio from YouTube URLs.
        </p>
        <div className="space-y-3 max-w-lg">
          <div>
            <label className="block text-xs font-medium text-[var(--secondary)] mb-1">yt-dlp path</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={ytdlpPath}
                onChange={(e) => {
                  setYtdlpPath(e.target.value)
                  window.api.setSetting('ytdlp_path', e.target.value)
                }}
                className="flex-1 px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
                placeholder="Auto-detect from PATH"
              />
              <button
                onClick={async () => {
                  const path = await window.api.selectDirectory()
                  if (path) {
                    setYtdlpPath(path)
                    window.api.setSetting('ytdlp_path', path)
                  }
                }}
                className="px-3 py-2.5 text-xs font-medium rounded-[12px] bg-[var(--surface)] text-[var(--text)] hover:bg-white/[0.08] transition-colors shrink-0"
              >
                Browse...
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--secondary)] mb-1">Custom arguments</label>
            <input
              type="text"
              value={ytdlpCustomArgs}
              onChange={(e) => {
                setYtdlpCustomArgs(e.target.value)
                window.api.setSetting('ytdlp_custom_args', e.target.value)
              }}
              className="w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors font-mono"
              placeholder="--cookies-from-browser chrome"
            />
          </div>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <div>
            <label className="block font-heading text-sm font-medium text-[var(--text)]">Templates</label>
            <p className="text-xs text-[var(--secondary)] mt-0.5">
              Prompt templates for generating content from transcripts.
            </p>
          </div>
          <button
            onClick={handleNewRecipe}
            className="px-3 py-1.5 text-xs font-medium rounded-[8px] bg-[var(--accent)] text-white hover:opacity-90 transition-opacity"
          >
            + New
          </button>
        </div>

        <div className="space-y-2 max-w-2xl">
          {recipes.map((recipe) => (
            <RecipeRow
              key={recipe.id}
              recipe={recipe}
              expanded={expandedId === recipe.id}
              onToggle={() => setExpandedId(expandedId === recipe.id ? null : recipe.id)}
              onUpdate={(fields) => handleRecipeUpdate(recipe.id, fields)}
              onDuplicate={() => handleRecipeDuplicate(recipe)}
              onDelete={() => handleRecipeDelete(recipe.id)}
              models={models}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
