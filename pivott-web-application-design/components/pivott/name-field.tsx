'use client'

import { Check } from 'lucide-react'
import { useId } from 'react'
import { NAME_MAX, setDisplayName, useAppState } from '@/lib/store'
import { cn } from '@/lib/utils'

export function NameField({
  label = 'Your name',
  hint = 'Optional. Saved on this device and synced when account sync is on.',
  className,
  autoFocus,
}: {
  label?: string
  hint?: string
  className?: string
  autoFocus?: boolean
}) {
  const id = useId()
  const { state } = useAppState()
  const demo = state.mode === 'demo'
  const hasName = state.name.trim().length > 0

  return (
    <div className={cn('flex w-full flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          value={state.name}
          maxLength={NAME_MAX}
          autoComplete="given-name"
          autoFocus={autoFocus}
          disabled={demo}
          spellCheck={false}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={(e) => {
            if (e.target.value !== e.target.value.trim()) setDisplayName(e.target.value.trim())
          }}
          placeholder="e.g. Sam"
          aria-describedby={`${id}-hint`}
          className="h-11 w-full rounded-xl border border-border-strong bg-card pl-3 pr-10 outline-none transition-[border-color,box-shadow] focus-visible:border-teal focus-visible:ring-4 focus-visible:ring-teal/15 disabled:cursor-not-allowed disabled:bg-subtle disabled:text-muted-foreground"
        />
        {hasName && !demo && (
          <Check aria-hidden className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-primary" />
        )}
      </div>
      <p id={`${id}-hint`} className="text-xs text-muted-foreground">
        {demo ? 'This is the demo persona. Exit the demo to use your own name.' : hint}
      </p>
    </div>
  )
}
