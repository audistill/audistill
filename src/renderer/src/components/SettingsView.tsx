import { useState, useEffect } from 'react'

const MODEL_OPTIONS = [
  'google/gemini-3.5-flash',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-4',
  'openai/gpt-4.1-mini',
]

const VIEW_OPTIONS = [
  { value: 'brief', label: 'Brief' },
  { value: 'detailed', label: 'Detailed' },
  { value: 'full', label: 'Full' },
] as const

export function SettingsView(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(MODEL_OPTIONS[0])
  const [defaultView, setDefaultView] = useState<string>('brief')
  const [customInstructions, setCustomInstructions] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.getSetting('openrouter_api_key'),
      window.api.getSetting('summarization_model'),
      window.api.getSetting('default_summary_view'),
      window.api.getSetting('custom_instructions'),
    ]).then(([key, savedModel, savedView, instructions]) => {
      if (key) setApiKey(key)
      if (savedModel) setModel(savedModel)
      if (savedView) setDefaultView(savedView)
      if (instructions) setCustomInstructions(instructions)
      setLoaded(true)
    })
  }, [])

  const saveApiKey = (value: string): void => {
    setApiKey(value)
    window.api.setSetting('openrouter_api_key', value)
  }

  const saveModel = (value: string): void => {
    setModel(value)
    window.api.setSetting('summarization_model', value)
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

      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">Summarization Model</label>
        <select
          value={model}
          onChange={(e) => saveModel(e.target.value)}
          className="w-full max-w-lg px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors appearance-none"
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <p className="text-xs text-[var(--secondary)] mt-1.5">
          Used for generating titles and summaries. Gemini 3.5 Flash recommended for speed and cost.
        </p>
      </div>

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
