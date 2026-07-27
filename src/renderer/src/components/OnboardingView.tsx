import { useState, useEffect } from 'react'
import { useModelStatusStore, type ModelStatus } from '../store/model-status-store'
import { useOpenRouterModels } from '../lib/use-openrouter-models'
import { ModelPicker } from './ModelPicker'

interface OnboardingViewProps {
  onComplete: () => void
}

const DEFAULT_MODEL = 'google/gemini-3.5-flash'

function ModelDownloadStatus({ status }: { status: ModelStatus }): React.JSX.Element {
  if (status.state === 'ready') {
    return (
      <div className="flex items-center gap-2 text-sm text-green-500">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        <span>Transcription model ready</span>
      </div>
    )
  }

  if (status.state === 'downloading') {
    const percent = status.percent ?? 0
    return (
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-[var(--secondary)]">
          <span>Downloading transcription model…</span>
          <span>{Math.round(percent)}%</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    )
  }

  if (status.state === 'error') {
    return (
      <div className="flex items-center justify-between">
        <span className="text-sm text-red-500">{status.error || 'Download failed'}</span>
        <button
          onClick={() => window.api.modelDownload()}
          className="text-xs text-[var(--accent)] hover:underline"
        >
          Retry
        </button>
      </div>
    )
  }

  // not-downloaded
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--secondary)]">
      <span className="w-1.5 h-1.5 rounded-full bg-[var(--secondary)] animate-pulse" />
      <span>Preparing transcription model…</span>
    </div>
  )
}

function Step2ModelSelection({ onComplete }: { onComplete: () => void }): React.JSX.Element {
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [saving, setSaving] = useState(false)
  const [fetchError, setFetchError] = useState('')
  const models = useOpenRouterModels()

  useEffect(() => {
    // If model fetch fails (empty list after timeout), show error
    const timer = setTimeout(() => {
      if (models.length === 0) {
        setFetchError('Could not load models. You can proceed with the default.')
      }
    }, 10000)
    return () => clearTimeout(timer)
  }, [models.length])

  // Clear error once models arrive
  useEffect(() => {
    if (models.length > 0) setFetchError('')
  }, [models.length])

  const handleGetStarted = async (): Promise<void> => {
    setSaving(true)
    try {
      await window.api.setSetting('default_model', selectedModel)
      onComplete()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-[14px] bg-[var(--surface)] flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--accent)]">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text)] mb-2">
            Pick your AI model
          </h1>
          <p className="text-sm text-[var(--secondary)] leading-relaxed max-w-sm">
            Every episode you add will be summarized with this model. You can change it later in Settings.
          </p>
        </div>

        <div className="text-left mb-6">
          <ModelPicker
            value={selectedModel}
            onChange={setSelectedModel}
            models={models}
            placeholder="Search models..."
          />
          {fetchError && (
            <p className="text-xs text-amber-500 mt-2">{fetchError}</p>
          )}
        </div>

        <button
          onClick={handleGetStarted}
          disabled={saving}
          className="w-full px-5 py-2.5 rounded-[12px] bg-[var(--accent)] text-white font-heading text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
        >
          {saving ? 'Saving...' : 'Get Started'}
        </button>
      </div>
    </div>
  )
}

export function OnboardingView({ onComplete }: OnboardingViewProps): React.JSX.Element {
  const [step, setStep] = useState<1 | 2>(1)
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [validating, setValidating] = useState(false)
  const { status, hydrate } = useModelStatusStore()

  useEffect(() => {
    hydrate()
  }, [hydrate])

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
        setStep(2)
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

  const handleOpenRouterLink = (): void => {
    window.api.openExternal('https://openrouter.ai/keys')
  }

  if (step === 2) {
    return <Step2ModelSelection onComplete={onComplete} />
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-12">
      <div className="w-full max-w-md text-center">
        {/* Logo & Value Pitch */}
        <div className="flex flex-col items-center mb-8">
          <svg width="56" height="56" viewBox="0 0 100 100" className="mb-4">
            <defs>
              <linearGradient id="onboard-drop-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: '#e89b7f' }} />
                <stop offset="100%" style={{ stopColor: '#d97757' }} />
              </linearGradient>
            </defs>
            <path
              d="M50,8 C50,8 80,45 80,62 C80,78.5 66.5,92 50,92 C33.5,92 20,78.5 20,62 C20,45 50,8 50,8 Z"
              fill="url(#onboard-drop-grad)"
            />
            <line x1="38" y1="55" x2="38" y2="69" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            <line x1="46" y1="50" x2="46" y2="74" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            <line x1="54" y1="48" x2="54" y2="76" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
            <line x1="62" y1="52" x2="62" y2="72" stroke="var(--bg)" strokeWidth="2.5" strokeLinecap="round" opacity="0.9" />
          </svg>
          <h1 className="font-heading text-2xl font-semibold text-[var(--text)] mb-2">
            Turn audio into searchable knowledge
          </h1>
          <p className="text-sm text-[var(--secondary)] leading-relaxed max-w-sm">
            Audistill transcribes podcasts, meetings, and lectures — then uses AI to generate summaries, notes, and answers you can search instantly.
          </p>
        </div>

        {/* Model download status */}
        <div className="mb-6 px-4 py-3 rounded-[12px] bg-[var(--surface)]">
          <ModelDownloadStatus status={status} />
        </div>

        {/* API Key section */}
        <div className="text-left mb-6">
          <label className="block font-heading text-sm font-medium text-[var(--text)] mb-1">
            OpenRouter API Key
          </label>
          <p className="text-xs text-[var(--secondary)] mb-3">
            AI features are powered by your OpenRouter API key — you control the model and cost.
          </p>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
            placeholder="sk-or-v1-..."
          />
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          <p className="text-xs text-[var(--secondary)] mt-2">
            <button
              onClick={handleOpenRouterLink}
              className="text-[var(--accent)] hover:underline cursor-pointer"
            >
              Get your API key →
            </button>
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
