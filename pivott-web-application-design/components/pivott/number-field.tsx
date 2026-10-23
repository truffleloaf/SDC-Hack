'use client'

import { useEffect, useRef, useState, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'defaultValue' | 'onChange' | 'min' | 'max' | 'step'> & {
  value: number; min: number; max: number; step?: number; onCommit: (value: number) => void
}
/** Keep a draft while editing; normalise only when the user commits. */
export function NumberField({ value, min, max, step = 1, onCommit, className, onBlur, onFocus, onKeyDown, ...props }: Props) {
  const [draft, setDraft] = useState(String(value))
  const focused = useRef(false)
  useEffect(() => { if (!focused.current) setDraft(String(value)) }, [value])
  function commit() {
    const parsed = draft.trim() ? Number(draft) : min
    const next = Number.isFinite(parsed) ? Math.min(max, Math.max(min, min + Math.round((parsed - min) / step) * step)) : value
    setDraft(String(next)); onCommit(next)
  }
  return <input {...props} type="number" inputMode="decimal" min={min} max={max} step={step} value={draft} className={cn('pivott-input', className)}
    onChange={(event) => setDraft(event.target.value)}
    onFocus={(event) => { focused.current = true; onFocus?.(event) }}
    onBlur={(event) => { focused.current = false; commit(); onBlur?.(event) }}
    onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur() } onKeyDown?.(event) }} />
}
