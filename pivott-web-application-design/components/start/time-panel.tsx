'use client'

import { ArrowRight } from 'lucide-react'
import { ShareBar } from './share-bar'
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
          Time by task
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{items.length} tasks</span>
      </div>

      <ShareBar state={state} />

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
        Drag a divider to move time between neighbours. Arrow keys move 1%; Shift + arrow moves 5%. Number fields and sliders rebalance the other tasks. Shares add up to 100%.
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
