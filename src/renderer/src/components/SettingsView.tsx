import { useState, useEffect, useRef } from 'react'
import { useOpenRouterModels, type ModelOption } from '../lib/use-openrouter-models'

const VIEW_OPTIONS = [
  { value: 'brief', label: 'Brief' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'full', label: 'Full' },
] as const

function ModelPicker({
  label,
  subtitle,
  value,
  onChange,
  models,
}: {
  label: string
  subtitle: string
  value: string
  onChange: (value: string) => void
  models: ModelOption[]
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
    <div className="mb-8">
      <label className="block font-heading text-sm font-medium text-[var(--text)] mb-0.5">{label}</label>
      <p className="text-xs text-[var(--secondary)] mb-2">{subtitle}</p>
      <div className="relative w-full max-w-lg" ref={ref}>
        <input
          type="text"
          value={open ? filter : value}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={() => {
            setOpen(true)
            setFilter('')
          }}
          className="w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
          placeholder="Search models..."
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

export function SettingsView(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [modelFast, setModelFast] = useState('google/gemini-3.1-flash-lite')
  const [modelQuality, setModelQuality] = useState('google/gemini-3.5-flash')
  const [defaultView, setDefaultView] = useState<string>('brief')
  const [customInstructions, setCustomInstructions] = useState('')
  const [loaded, setLoaded] = useState(false)

  const models = useOpenRouterModels()

  useEffect(() => {
    Promise.all([
      window.api.getSetting('openrouter_api_key'),
      window.api.getSetting('model_fast'),
      window.api.getSetting('model_quality'),
      window.api.getSetting('default_summary_view'),
      window.api.getSetting('custom_instructions'),
    ]).then(([key, savedFast, savedQuality, savedView, instructions]) => {
      if (key) setApiKey(key)
      if (savedFast) setModelFast(savedFast)
      if (savedQuality) setModelQuality(savedQuality)
      if (savedView) setDefaultView(savedView)
      if (instructions) setCustomInstructions(instructions)
      setLoaded(true)
    })
  }, [])

  const saveApiKey = (value: string): void => {
    setApiKey(value)
    window.api.setSetting('openrouter_api_key', value)
  }

  const saveModelFast = (value: string): void => {
    setModelFast(value)
    window.api.setSetting('model_fast', value)
  }

  const saveModelQuality = (value: string): void => {
    setModelQuality(value)
    window.api.setSetting('model_quality', value)
  }

  const saveDefaultView = (value: string): void => {
    setDefaultView(value)
    window.api.setSetting('default_summary_view', value)
  }

  const saveCustomInstructions = (value: string): void => {
    setCustomInstructions(value)
    window.api.setSetting('custom_instructions', value)
  }

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
        label="Brief Summary Model"
        subtitle="Used for brief summaries"
        value={modelFast}
        onChange={saveModelFast}
        models={models}
      />

      <ModelPicker
        label="Detailed & Chat Model"
        subtitle="Used for detailed, full summaries and chat"
        value={modelQuality}
        onChange={saveModelQuality}
        models={models}
      />

      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">Default Summary View</label>
        <div className="inline-flex rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => saveDefaultView(opt.value)}
              className={`px-4 py-1.5 rounded-[8px] text-sm font-medium transition-colors ${
                defaultView === opt.value
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--secondary)] hover:text-[var(--text)]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--secondary)] mt-1.5">
          New episodes will be summarized at this detail level during import. Changing this only affects future episodes.
        </p>
      </div>

      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">Custom Instructions</label>
        <textarea
          rows={5}
          value={customInstructions}
          onChange={(e) => saveCustomInstructions(e.target.value)}
          className="w-full max-w-lg px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors resize-none"
          placeholder='Additional instructions appended to the summarization prompt...'
        />
        <p className="text-xs text-[var(--secondary)] mt-1.5">
          These are added to the default prompt. Example: &quot;Also extract action items&quot; or &quot;Summarize in English regardless of source language.&quot;
        </p>
      </div>
    </div>
  )
}
