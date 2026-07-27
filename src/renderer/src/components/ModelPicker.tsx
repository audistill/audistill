import { useState, useEffect, useRef } from 'react'
import type { ModelOption } from '../lib/use-openrouter-models'

export function ModelPicker({
  label,
  subtitle,
  value,
  onChange,
  models,
  placeholder,
}: {
  label?: string
  subtitle?: string
  value: string
  onChange: (value: string) => void
  models: ModelOption[]
  placeholder?: string
}): React.JSX.Element {
  const [filter, setFilter] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent): void {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = models.length > 0
    ? models.filter((m) => {
        if (!filter) return true
        const lower = filter.toLowerCase()
        return m.id.toLowerCase().includes(lower) || (m.name && m.name.toLowerCase().includes(lower))
      })
    : []

  return (
    <div className={label ? 'mb-8' : ''}>
      {label && <label className="block font-heading text-sm font-medium text-[var(--text)] mb-0.5">{label}</label>}
      {subtitle && <p className="text-xs text-[var(--secondary)] mb-2">{subtitle}</p>}
      <div className="relative w-full max-w-lg" ref={ref}>
        <input
          type="text"
          value={open ? filter : value || ''}
          onChange={(e) => setFilter(e.target.value)}
          onFocus={() => {
            setOpen(true)
            setFilter('')
          }}
          className="w-full px-4 py-2.5 rounded-[12px] bg-[var(--surface)] border border-[var(--surface)] text-[var(--text)] text-sm outline-none focus:border-[var(--accent)] transition-colors"
          placeholder={placeholder ?? 'Search models...'}
        />
        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-[10px] bg-[var(--bg)] border border-[var(--surface)] shadow-xl z-50">
            {filtered.length > 0 ? (
              filtered.map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    onChange(m.id)
                    setOpen(false)
                    setFilter('')
                  }}
                  className={`w-full text-left px-4 py-2 text-sm truncate hover:bg-[var(--surface)] transition-colors ${
                    m.id === value ? 'text-[var(--accent)]' : 'text-[var(--text)]'
                  }`}
                >
                  {m.id}
                </button>
              ))
            ) : (
              <p className="px-4 py-2 text-sm text-[var(--secondary)]">
                {models.length === 0 ? 'Loading models...' : 'No models found'}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
