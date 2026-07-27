/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../../store/app-store'
import { PrototypeSwitcher } from './PrototypeSwitcher'
import { RecordingPrototypeTabBar } from './RecordingPrototypeTabBar'
import { useRecordingPrototypeStore } from './recording-panel-prototype-store'

// PROTOTYPE — THROWAWAY

beforeEach(() => {
  useRecordingPrototypeStore.getState().reset()
  useAppStore.setState({ leftSidebarOpen: true, rightSidebarOpen: true })
})

afterEach(() => {
  cleanup()
})

describe('RecordingPrototypeTabBar', () => {
  it('uses roving focus and selects the adjacent workspace with Left/Right', () => {
    useRecordingPrototypeStore.getState().setWorkspace('episode')
    render(<RecordingPrototypeTabBar />)

    const episodeTab = screen.getByRole('tab', { name: 'Quarterly planning' })
    const recordingTab = screen.getByRole('tab', { name: /Recording workspace/ })

    expect(episodeTab).toHaveAttribute('tabindex', '0')
    expect(recordingTab).toHaveAttribute('tabindex', '-1')

    episodeTab.focus()
    fireEvent.keyDown(episodeTab, { key: 'ArrowRight' })

    expect(useRecordingPrototypeStore.getState().workspace).toBe('recording')
    expect(recordingTab).toHaveFocus()
    expect(recordingTab).toHaveAttribute('tabindex', '0')

    fireEvent.keyDown(recordingTab, { key: 'ArrowLeft' })
    expect(useRecordingPrototypeStore.getState().workspace).toBe('episode')
    expect(episodeTab).toHaveFocus()
  })

  it('does not let the variant switcher hijack tab arrow navigation', () => {
    useRecordingPrototypeStore.getState().setWorkspace('episode')
    const onVariantChange = vi.fn()
    render(
      <>
        <RecordingPrototypeTabBar />
        <PrototypeSwitcher variant="A" onVariantChange={onVariantChange} />
      </>
    )

    fireEvent.keyDown(screen.getByRole('tab', { name: 'Quarterly planning' }), {
      key: 'ArrowRight'
    })

    expect(onVariantChange).not.toHaveBeenCalled()
    expect(useRecordingPrototypeStore.getState().workspace).toBe('recording')
  })
})
