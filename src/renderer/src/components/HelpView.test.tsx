/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ContentPane } from './ContentPane'
import { UpdateBanner } from './UpdateBanner'
import { useAppStore } from '../store/app-store'
import { useUpdateStore } from '../store/update-store'
import { useModelStatusStore } from '../store/model-status-store'
import { releaseNotes } from '../generated/content-manifest'

const mockApi = {
  update: {
    getStatus: vi.fn(),
    check: vi.fn(),
    install: vi.fn(),
    dismiss: vi.fn(),
    onStatusChanged: vi.fn(() => () => {}),
  },
  getSetting: vi.fn(),
}

beforeEach(() => {
  vi.clearAllMocks()
  // @ts-expect-error - partial preload API mock for Help flow tests
  window.api = mockApi
  useModelStatusStore.setState({ status: { state: 'ready' }, hydrated: true })
  useAppStore.setState({
    episodes: [],
    tabs: [],
    activeTabId: null,
    settingsOpen: false,
    helpOpen: false,
    helpTarget: null,
    hydrated: true,
  })
  useUpdateStore.setState({
    status: { state: 'idle', currentVersion: '0.4.0' },
    dismissedVersion: null,
    hydrated: true,
  })
})

afterEach(() => {
  cleanup()
})

describe('HelpView', () => {
  it('opens to Getting Started by default', () => {
    useAppStore.getState().openHelp({ kind: 'help' })

    render(<ContentPane />)

    expect(screen.getByRole('heading', { name: 'Getting Started' })).toBeInTheDocument()
    expect(screen.getByText(/Welcome to Audistill/)).toBeInTheDocument()
  })

  it('navigates between Help articles and Release Notes without opening an Episode', () => {
    useAppStore.getState().openHelp({ kind: 'help' })

    render(<ContentPane />)

    fireEvent.click(screen.getByRole('button', { name: 'Recipes and Tabs' }))
    expect(screen.getByRole('heading', { name: 'Recipes and Tabs' })).toBeInTheDocument()
    expect(screen.getByText(/Generated Tabs keep provenance/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'v0.4.0' }))
    expect(screen.getByRole('heading', { name: 'Audistill 0.4.0' })).toBeInTheDocument()
    expect(screen.getByText(/Baseline capabilities/)).toBeInTheDocument()
    expect(useAppStore.getState().activeTabId).toBeNull()
  })
})

describe('UpdateBanner What\'s new flow', () => {
  it('opens the bundled Release Note for the available version', () => {
    useUpdateStore.setState({ status: { state: 'ready', version: '0.4.0', currentVersion: '0.3.0' }, hydrated: true })

    render(
      <>
        <UpdateBanner />
        <ContentPane />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: "What's new?" }))

    expect(screen.getByRole('heading', { name: 'Audistill 0.4.0' })).toBeInTheDocument()
    expect(screen.getByText(/Local-first Episode Library/)).toBeInTheDocument()
  })

  it('falls back to the latest bundled Release Note when an exact update version is missing', () => {
    const latestReleaseNote = releaseNotes[0]
    useUpdateStore.setState({ status: { state: 'ready', version: '9.9.9', currentVersion: '0.4.0' }, hydrated: true })

    render(
      <>
        <UpdateBanner />
        <ContentPane />
      </>
    )

    fireEvent.click(screen.getByRole('button', { name: "What's new?" }))

    expect(screen.getByRole('heading', { name: latestReleaseNote.title })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `v${latestReleaseNote.version}` })).toBeInTheDocument()
  })

  it('keeps Restart and Dismiss actions wired to the update store', () => {
    const install = vi.fn()
    const dismiss = vi.fn()
    useUpdateStore.setState({
      status: { state: 'ready', version: '0.4.0', currentVersion: '0.3.0' },
      hydrated: true,
      install,
      dismiss,
    })

    render(<UpdateBanner />)

    fireEvent.click(screen.getByRole('button', { name: 'Restart' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(install).toHaveBeenCalled()
    expect(dismiss).toHaveBeenCalled()
  })
})
