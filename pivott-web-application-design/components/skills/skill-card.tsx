'use client'

import { motion } from 'motion/react'
import { useId, useRef, type KeyboardEvent } from 'react'
import type { Skill } from '@/lib/data/seed'
import { cn } from '@/lib/utils'

export const levels = ['None', 'Basic', 'Working', 'Strong', 'Expert']

export function SkillCard({
  skill,
  level,
  suggested,
  onChange,
}: {
  skill: Skill
  level: number | undefined
  suggested: boolean
  onChange: (v: number) => void
}) {
  const id = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])
  const rated = level !== undefined

  function onKey(e: KeyboardEvent, i: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = Math.max(0, Math.min(4, i + (e.key === 'ArrowRight' ? 1 : -1)))
    onChange(next)
    refs.current[next]?.focus()
  }

  return (
    <div className={cn('card-surface card-lift flex flex-col gap-4 p-5', rated && 'border-teal/25')}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id={`${id}-l`} className="font-medium leading-snug">
            {skill.name}
          </h3>
          <span className="font-sans text-xs font-medium text-faint">{skill.category}</span>
        </div>
        {suggested && (
          <span className="shrink-0 rounded-full bg-sky px-2 py-0.5 text-[11px] font-medium text-foreground">Suggested</span>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div
          role="radiogroup"
          aria-labelledby={`${id}-l`}
          className="relative grid grid-cols-5 gap-1 rounded-xl border border-border bg-subtle p-1"
        >
          {levels.map((label, i) => {
            const active = level === i
            return (
              <button
                key={label}
                ref={(el) => {
                  refs.current[i] = el
                }}
                type="button"
                role="radio"
                aria-checked={active}
                aria-label={`${i} — ${label}`}
                tabIndex={active || (!rated && i === 0) ? 0 : -1}
                onKeyDown={(e) => onKey(e, i)}
                onClick={() => onChange(i)}
                className={cn(
                  'relative z-10 h-11 rounded-lg font-mono text-sm transition-colors duration-200',
                  active ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {active && (
                  <motion.span
                    layoutId={`lvl-${id}`}
                    className="absolute inset-0 -z-10 rounded-lg bg-primary shadow-soft"
                    transition={{ type: 'spring', stiffness: 520, damping: 38 }}
                  />
                )}
                {i}
              </button>
            )
          })}
        </div>
        <p className="flex justify-between text-xs text-muted-foreground" aria-live="polite">
          <span>{rated ? levels[level] : 'Not rated yet'}</span>
          {rated && <span className="font-mono text-faint">{level}/4</span>}
        </p>
      </div>
    </div>
  )
}
