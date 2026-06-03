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
        <div className="flex flex-col items-center mb-8">
          <svg width="56" height="56" viewBox="0 0 100 100" className="mb-4">
            <defs>
              <linearGradient id="onboard-drop-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor:'#e89b7f'}} />
                <stop offset="100%" style={{stopColor:'#d97757'}} />
              </linearGradient>
            </defs>
            <path d="M50,8 C50,8 80,45 80,62 C80,78.5 66.5,92 50,92 C33.5,92 20,78.5 20,62 C20,45 50,8 50,8 Z" fill="url(#onboard-drop-grad)" />
            <line x1="38" y1="55" x2="38" y2="69" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="46" y1="50" x2="46" y2="74" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="54" y1="48" x2="54" y2="76" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
            <line x1="62" y1="52" x2="62" y2="72" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9"/>
          </svg>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text)] mb-1">Audistill</h1>
          <p className="text-sm text-[var(--secondary)]">Distill knowledge from every conversation.</p>
        </div>

        <p className="text-sm text-[var(--secondary)] mb-8">
          Add an OpenRouter API key to enable AI-powered summaries.
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
