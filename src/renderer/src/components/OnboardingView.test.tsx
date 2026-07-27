/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { OnboardingView } from './OnboardingView'
import { useModelStatusStore } from '../store/model-status-store'

// Mock window.api
const mockApi = {
  validateApiKey: vi.fn(),
  setSetting: vi.fn(),
  openExternal: vi.fn(),
  modelGetStatus: vi.fn().mockResolvedValue({ state: 'downloading', percent: 42 }),
  modelDownload: vi.fn(),
  onModelStatusChanged: vi.fn(() => () => {}),
  onModelDownloadProgress: vi.fn(() => () => {}),
  chatFetchModels: vi.fn().mockResolvedValue([
    { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  ]),
}

beforeEach(() => {
  vi.resetAllMocks()
  mockApi.modelGetStatus.mockResolvedValue({ state: 'downloading', percent: 42 })
  mockApi.onModelStatusChanged.mockReturnValue(() => {})
  mockApi.onModelDownloadProgress.mockReturnValue(() => {})
  mockApi.chatFetchModels.mockResolvedValue([
    { id: 'google/gemini-3.5-flash', name: 'Gemini 3.5 Flash' },
    { id: 'anthropic/claude-sonnet-4', name: 'Claude Sonnet 4' },
  ])
  mockApi.validateApiKey.mockResolvedValue(false)
  mockApi.setSetting.mockResolvedValue(undefined)
  // @ts-expect-error - partial mock
  window.api = mockApi
  // Reset zustand store state between tests
  useModelStatusStore.setState({ status: { state: 'not-downloaded' }, hydrated: false })
})

afterEach(() => {
  cleanup()
})

describe('OnboardingView — Step 1', () => {
  it('renders value pitch headline', () => {
    render(<OnboardingView onComplete={() => {}} />)
    expect(screen.getByText('Turn audio into searchable knowledge')).toBeInTheDocument()
  })

  it('explains why API key is needed', () => {
    render(<OnboardingView onComplete={() => {}} />)
    expect(
      screen.getByText(/AI features are powered by your OpenRouter API key/)
    ).toBeInTheDocument()
  })

  it('shows "Get your API key" link that opens external URL', () => {
    render(<OnboardingView onComplete={() => {}} />)
    const link = screen.getByText('Get your API key →')
    fireEvent.click(link)
    expect(mockApi.openExternal).toHaveBeenCalledWith('https://openrouter.ai/keys')
  })

  it('shows model download progress when downloading', async () => {
    render(<OnboardingView onComplete={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Downloading transcription model…')).toBeInTheDocument()
      expect(screen.getByText('42%')).toBeInTheDocument()
    })
  })

  it('shows checkmark when model is ready', async () => {
    mockApi.modelGetStatus.mockResolvedValue({ state: 'ready' })
    render(<OnboardingView onComplete={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Transcription model ready')).toBeInTheDocument()
    })
  })

  it('shows error with retry button when model download fails', async () => {
    mockApi.modelGetStatus.mockResolvedValue({ state: 'error', error: 'Network timeout' })
    render(<OnboardingView onComplete={() => {}} />)
    await waitFor(() => {
      expect(screen.getByText('Network timeout')).toBeInTheDocument()
      expect(screen.getByText('Retry')).toBeInTheDocument()
    })
  })

  it('shows error when submitting empty key', () => {
    render(<OnboardingView onComplete={() => {}} />)
    fireEvent.click(screen.getByText('Validate & Continue'))
    expect(screen.getByText('Please enter an API key.')).toBeInTheDocument()
  })

  it('shows error on invalid key', async () => {
    mockApi.validateApiKey.mockResolvedValue(false)
    render(<OnboardingView onComplete={() => {}} />)
    const input = screen.getByPlaceholderText('sk-or-v1-...')
    fireEvent.change(input, { target: { value: 'bad-key' } })
    fireEvent.click(screen.getByText('Validate & Continue'))

    await waitFor(() => {
      expect(screen.getByText('Invalid API key. Please check your key and try again.')).toBeInTheDocument()
    })
  })

  it('shows network error on fetch failure', async () => {
    mockApi.validateApiKey.mockRejectedValue(new Error('fetch failed'))
    render(<OnboardingView onComplete={() => {}} />)
    const input = screen.getByPlaceholderText('sk-or-v1-...')
    fireEvent.change(input, { target: { value: 'some-key' } })
    fireEvent.click(screen.getByText('Validate & Continue'))

    await waitFor(() => {
      expect(
        screen.getByText('Could not reach OpenRouter. Check your internet connection and try again.')
      ).toBeInTheDocument()
    })
  })
})

describe('OnboardingView — Step 2', () => {
  async function advanceToStep2(): Promise<void> {
    mockApi.validateApiKey.mockResolvedValue(true)
    render(<OnboardingView onComplete={vi.fn()} />)
    const input = screen.getByPlaceholderText('sk-or-v1-...')
    fireEvent.change(input, { target: { value: 'sk-or-v1-valid' } })
    fireEvent.click(screen.getByText('Validate & Continue'))
    await waitFor(() => {
      expect(screen.getByText('Pick your AI model')).toBeInTheDocument()
    })
  }

  it('transitions to step 2 after key validation', async () => {
    await advanceToStep2()
    expect(screen.getByText('Pick your AI model')).toBeInTheDocument()
  })

  it('pre-fills with default model (google/gemini-3.5-flash)', async () => {
    await advanceToStep2()
    const input = screen.getByPlaceholderText('Search models...')
    expect(input).toHaveValue('google/gemini-3.5-flash')
  })

  it('"Get Started" saves model and calls onComplete', async () => {
    mockApi.validateApiKey.mockResolvedValue(true)
    const onComplete = vi.fn()
    render(<OnboardingView onComplete={onComplete} />)
    const input = screen.getByPlaceholderText('sk-or-v1-...')
    fireEvent.change(input, { target: { value: 'sk-or-v1-valid' } })
    fireEvent.click(screen.getByText('Validate & Continue'))

    await waitFor(() => {
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('Get Started'))

    await waitFor(() => {
      expect(mockApi.setSetting).toHaveBeenCalledWith('default_model', 'google/gemini-3.5-flash')
      expect(onComplete).toHaveBeenCalled()
    })
  })
})
