'use client'

import { Check, CornerDownLeft, Search } from 'lucide-react'
import { useId, useMemo, useState, type KeyboardEvent } from 'react'
import { roles, tasksForRole } from '@/lib/data/seed'
import { cn } from '@/lib/utils'

const families = ['All', ...Array.from(new Set(roles.map((r) => r.family.split(' & ')[0])))]

export function RoleSelector({ value, onSelect }: { value: string | null; onSelect: (id: string) => void }) {
  const [query, setQuery] = useState('')
  const [family, setFamily] = useState('All')
  const [cursor, setCursor] = useState(0)
  const listId = useId()

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return roles.filter(
      (r) =>
        (family === 'All' || r.family.startsWith(family)) &&
        (!q || r.title.toLowerCase().includes(q) || r.family.toLowerCase().includes(q)),
    )
  }, [query, family])

  const active = Math.min(cursor, Math.max(0, results.length - 1))

  function onKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setCursor((c) => Math.min(results.length - 1, c + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setCursor((c) => Math.max(0, c - 1))
    } else if (e.key === 'Enter') {
      if (e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      const r = results[active]
      if (r) onSelect(r.id)
    }
  }

  return (
    <div className="card-surface overflow-hidden">
      <div className="flex items-center gap-3 border-b border-border px-5">
        <Search className="size-5 text-faint" aria-hidden />
        <input
          role="combobox"
          aria-expanded
          aria-controls={listId}
          aria-activedescendant={results[active] ? `${listId}-${results[active].id}` : undefined}
          aria-label="Search for your role"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setCursor(0)
          }}
          onKeyDown={onKey}
          placeholder="Search roles, e.g. Finance Admin"
          className="h-16 w-full bg-transparent text-lg outline-none placeholder:text-faint"
        />
        <kbd className="hidden items-center gap-1 rounded-md border border-border px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground sm:inline-flex">
          <CornerDownLeft className="size-3" aria-hidden /> select
        </kbd>
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-border px-5 py-3" role="group" aria-label="Filter by role family">
        {families.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={family === f}
            onClick={() => {
              setFamily(f)
              setCursor(0)
            }}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3 text-xs font-medium transition-colors',
              family === f
                ? 'border-teal/40 bg-mint text-accent-foreground'
                : 'border-border text-muted-foreground hover:border-border-strong hover:text-foreground',
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <ul id={listId} role="listbox" aria-label="Roles" className="max-h-80 overflow-y-auto p-2">
        {results.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            No matching roles yet. Try another family or a broader term.
          </li>
        )}
        {results.map((r, i) => {
          const selected = value === r.id
          return (
            <li
              key={r.id}
              id={`${listId}-${r.id}`}
              role="option"
              aria-selected={selected}
              onMouseEnter={() => setCursor(i)}
              onClick={() => onSelect(r.id)}
              className={cn(
                'flex min-h-14 cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-2.5 transition-colors',
                i === active && 'bg-subtle',
                selected && 'bg-mint',
              )}
            >
              <div className="flex flex-col">
                <span className="font-medium">{r.title}</span>
                <span className="text-xs text-muted-foreground">
                  {r.family} · {tasksForRole(r.id).length} tasks
                </span>
              </div>
              {selected ? (
                <Check className="size-4 text-primary" aria-hidden />
              ) : (
                <span className="font-mono text-[11px] text-faint">demand {r.demand}</span>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
