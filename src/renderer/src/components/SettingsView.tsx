export function SettingsView(): React.JSX.Element {
  return (
    <div className="flex-1 overflow-y-auto px-12 py-8">
      <h1 className="font-heading text-2xl font-semibold text-[var(--text)] mb-8">Settings</h1>

      {/* API Key */}
      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">OpenRouter API Key</label>
        <input
          type="password"
          defaultValue="sk-or-v1-xxxx...xxxx"
          className="w-full max-w-lg px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
          placeholder="sk-or-v1-..."
        />
        <p className="text-xs text-[var(--secondary)] mt-1.5">
          Your API key is stored locally and never sent anywhere except OpenRouter.
        </p>
      </div>

      {/* Model */}
      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">Summarization Model</label>
        <select className="w-full max-w-lg px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors appearance-none">
          <option>google/gemini-3.5-flash</option>
          <option>anthropic/claude-sonnet-4</option>
          <option>anthropic/claude-haiku-4</option>
          <option>openai/gpt-4.1-mini</option>
        </select>
        <p className="text-xs text-[var(--secondary)] mt-1.5">
          Used for generating titles and summaries. Gemini 3.5 Flash recommended for speed and cost.
        </p>
      </div>

      {/* Custom Instructions */}
      <div className="mb-8">
        <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">Custom Instructions</label>
        <textarea
          rows={5}
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
