/**
 * @vitest-environment happy-dom
 */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsView } from './SettingsView'

vi.mock('../lib/use-openrouter-models', () => ({
  useOpenRouterModels: () => [],
}))

vi.mock('../store/model-status-store', () => ({
  useModelStatusStore: (selector: (state: { status: { state: string; percent: number }; hydrate: () => void }) => unknown) =>
    selector({ status: { state: 'ready', percent: 0 }, hydrate: vi.fn() }),
}))

vi.mock('./LicensePane', () => ({
  LicensePane: () => <div />,
}))

vi.mock('./UpdateSettingsSection', () => ({
  UpdateSettingsSection: () => <div />,
}))

vi.mock('./ModelPicker', () => ({
  ModelPicker: ({ label, subtitle }: { label?: string; subtitle?: string }) => (
    <div>
      {label && <span>{label}</span>}
      {subtitle && <span>{subtitle}</span>}
    </div>
  ),
}))

const recipes = [
  {
    id: 'recipe-brief',
    name: 'Brief',
    prompt: 'Brief prompt',
    model_override: null,
    is_builtin: 1,
    sort_order: 0,
    created_at: '2026-07-01',
  },
]

const mockApi = {
  getSetting: vi.fn(),
  setSetting: vi.fn().mockResolvedValue(undefined),
  recipesGetAll: vi.fn(),
  recipesCreate: vi.fn().mockResolvedValue('recipe-new'),
  recipesUpdate: vi.fn().mockResolvedValue(undefined),
  recipesDelete: vi.fn().mockResolvedValue(undefined),
  modelDelete: vi.fn().mockResolvedValue(undefined),
  modelDownload: vi.fn().mockResolvedValue(undefined),
  selectDirectory: vi.fn().mockResolvedValue(null),
}

beforeEach(() => {
  vi.clearAllMocks()
  mockApi.getSetting.mockResolvedValue(null)
  mockApi.recipesGetAll.mockResolvedValue(recipes)
  // @ts-expect-error - partial preload API mock for SettingsView tests
  window.api = mockApi
})

afterEach(() => {
  cleanup()
})

describe('SettingsView Recipe copy', () => {
  it('uses Recipe language for pipeline and reusable prompt settings', async () => {
    render(<SettingsView />)

    await waitFor(() => expect(screen.getByText('Pipeline Recipe')).toBeInTheDocument())

    expect(screen.getByText('This Recipe auto-runs when you import new audio.')).toBeInTheDocument()
    expect(screen.getByText('Recipes')).toBeInTheDocument()
    expect(screen.getByText('Reusable prompts that generate Tabs from Transcripts.')).toBeInTheDocument()
    expect(screen.getByText('Used for all Recipes unless overridden per Recipe')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '+ New Recipe' })).toBeInTheDocument()
    expect(screen.queryByText(/Template/)).not.toBeInTheDocument()
  })

  it('creates new reusable prompts as Recipes', async () => {
    render(<SettingsView />)

    const button = await screen.findByRole('button', { name: '+ New Recipe' })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockApi.recipesCreate).toHaveBeenCalledWith({
        name: 'New Recipe',
        prompt: '',
      })
    })
  })
})
