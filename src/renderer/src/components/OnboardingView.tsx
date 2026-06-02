import { useState } from 'react'

interface OnboardingViewProps {
  onComplete: () => void
}

export function OnboardingView({ onComplete }: OnboardingViewProps): React.JSX.Element {
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)

  const handleValidate = async (): Promise<void> => {
    const trimmedKey = apiKey.trim()
    if (!trimmedKey) {
      setError('Please enter an API key.')
      return
    }
    setValidating(true)
    setError('')

    try {
      const valid = await window.api.validateApiKey(trimmedKey)
      if (valid) {
        await window.api.setSetting('openrouter_api_key', trimmedKey)
        onComplete()
      } else {
        setError('Invalid API key. Please check your key and try again.')
      }
    } catch {
      setError('Could not reach OpenRouter. Check your internet connection and try again.')
    } finally {
      setValidating(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !validating) {
      handleValidate()
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        <div className="w-16 h-16 rounded-[12px] bg-[var(--surface)] flex items-center justify-center mx-auto mb-6">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-semibold text-[var(--text)] mb-2">Welcome to PodCapture</h1>
        <p className="text-sm text-[var(--secondary)] mb-8">
          Your local audio knowledge base. Add an OpenRouter API key to enable AI-powered summaries.
        </p>

        <div className="text-left mb-6">
          <label className="block font-heading text-sm font-medium text-[var(--text)] mb-2">OpenRouter API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="sk-or-v1-..."
          />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          <p className="text-xs text-[var(--secondary)] mt-1.5">
            You can change this later in Settings.
          </p>
        </div>

        <button
          onClick={handleValidate}
          disabled={validating}
          className="w-full px-5 py-2.5 rounded-[12px] bg-[var(--accent)] text-white font-heading text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {validating ? 'Validating...' : 'Validate & Continue'}
        </button>
      </div>
    </div>
  )
}
