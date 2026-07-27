/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RecordingSourceRow } from './RecordingSourceRow'

// PROTOTYPE — THROWAWAY

afterEach(cleanup)

describe('RecordingSourceRow toggle', () => {
  it('anchors the thumb to the track before applying its state translation', () => {
    render(
      <RecordingSourceRow
        kind="system"
        label="System Audio"
        detail="Audio playing on this Mac"
        enabled
        phase="setup"
        onToggle={vi.fn()}
      />
    )

    const thumb = screen.getByRole('switch', { name: 'Turn off System Audio' }).querySelector('span')
    expect(thumb).toHaveClass('left-0')
  })
})
