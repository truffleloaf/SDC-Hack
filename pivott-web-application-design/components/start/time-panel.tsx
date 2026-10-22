'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { PLink } from '@/components/pivott/p-button'
import { taskLookup, type AppState } from '@/lib/store'

const tints = [1, 0.78, 0.6, 0.45, 0.33, 0.24, 0.17, 0.12]

export function TimePanel({ state }: { state: AppState }) {
  const lookup = taskLookup(state)
  const items = state.selections.filter((s) => lookup[s.taskId])
  return (
    <section aria-labelledby="time-title" className="card-surface flex flex-col gap-5 p-6">
      <div className="flex items-baseline justify-between">
        <h2 id="time-title" className="font-serif text-2xl">
          Your time, your way
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{items.length} tasks</span>
      </div>

      <div className="flex h-4 w-full overflow-hidden rounded-full bg-subtle" role="img" aria-label="Time distribution across selected tasks">
        {items.map((s, i) => (
          <motion.span
            key={s.taskId}
            layout
            initial={false}
            animate={{ width: `${s.share}%` }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}
            className="h-full border-r-2 border-card last:border-r-0"
            style={{ backgroundColor: `color-mix(in srgb, var(--teal) ${tints[i % tints.length] * 100}%, var(--mint))` }}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {items.map((s, i) => (
          <li key={s.taskId} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: `color-mix(in srgb, var(--teal) ${tints[i % tints.length] * 100}%, var(--mint))` }}
                aria-hidden
              />
              <span className="truncate">{state.taskNames[s.taskId] || lookup[s.taskId].name}</span>
            </span>
            <span className="font-mono tabular-nums text-muted-foreground">{Math.round(s.share)}%</span>
          </li>
        ))}
        {items.length === 0 && <li className="text-sm text-muted-foreground">Select at least one task to continue.</li>}
      </ul>

      <p className="border-t border-border pt-4 text-xs leading-relaxed text-muted-foreground">
        Shares rebalance automatically and always add up to 100%.
      </p>

      <PLink
        href="/map"
        className="hidden w-full lg:inline-flex"
        aria-disabled={items.length === 0}
        tabIndex={items.length === 0 ? -1 : undefined}
        onClick={(e) => items.length === 0 && e.preventDefault()}
      >
        View my task map
        <ArrowRight aria-hidden />
      </PLink>
    </section>
  )
}
