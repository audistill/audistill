import { useState, useEffect } from 'react'

const MODEL_OPTIONS = [
  'google/gemini-3.5-flash',
  'anthropic/claude-sonnet-4',
  'anthropic/claude-haiku-4',
  'openai/gpt-4.1-mini',
]

export function SettingsView(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState(MODEL_OPTIONS[0])
  const [customInstructions, setCustomInstructions] = useState('')
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    Promise.all([
      window.api.getSetting('openrouter_api_key'),
      window.api.getSetting('summarization_model'),
      window.api.getSetting('custom_instructions'),
    ]).then(([key, savedModel, instructions]) => {
      if (key) setApiKey(key)
      if (savedModel) setModel(savedModel)
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
