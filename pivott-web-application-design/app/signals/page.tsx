'use client'

import { ArrowRight, ExternalLink, RefreshCw, ShieldPlus, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { DirectionBadge, EvidenceBadge } from '@/components/pivott/badges'
import { PButton } from '@/components/pivott/p-button'
import { PageIntro } from '@/components/pivott/route-stepper'
import { SegmentedControl } from '@/components/pivott/segmented-control'
import { EmptyState, PageSkeleton } from '@/components/pivott/states'
import { AdminSheet } from '@/components/signals/admin-sheet'
import { DATA_AS_OF, signals as seedSignals, taskById } from '@/lib/data/seed'
import { ageDays, recency, roleExposure } from '@/lib/engine'
import { activeSignals, computeScored, setState, useAppState } from '@/lib/store'
import { cn } from '@/lib/utils'

type Dir = 'all' | 'up' | 'down'
type Rec = 'all' | '90' | '180' | '365'

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function SignalsPage() {
  const { state, hydrated } = useAppState()
  const [dir, setDir] = useState<Dir>('all')
  const [rec, setRec] = useState<Rec>('all')
  const [adminOpen, setAdminOpen] = useState(false)
  const [computing, setComputing] = useState(false)

  if (!hydrated) return <PageSkeleton />

  const pending = state.customSignals.filter((s) => !state.appliedSignalIds.includes(s.id))
  const all = [...seedSignals, ...state.customSignals].sort((a, b) => b.date.localeCompare(a.date))
  const mine = new Set(state.selections.map((s) => s.taskId))
  const filtered = all.filter(
    (s) =>
      (dir === 'all' || (dir === 'up' ? s.direction === 1 : s.direction === -1)) &&
      (rec === 'all' || ageDays(s.date) <= Number(rec)),
  )

  async function recompute() {
    setComputing(true)
    const beforeScored = computeScored(state)
    await new Promise((r) => setTimeout(r, 900))
    const appliedSignalIds = [...state.appliedSignalIds, ...pending.map((p) => p.id)]
    const next = { ...state, appliedSignalIds }
    const afterScored = computeScored(next, next.scenario, activeSignals(next))
    const changed = afterScored
      .map((t, i) => ({ taskId: t.id, before: beforeScored[i]?.exposure ?? t.exposure, after: t.exposure }))
      .filter((c) => Math.abs(c.after - c.before) > 0.0005)
    setState({ appliedSignalIds, recentlyChanged: changed })
    setComputing(false)
    const b = roleExposure(beforeScored)
    const a = roleExposure(afterScored)
    toast.success('Task map recomputed', {
      description: changed.length
        ? `${changed.length} of your tasks changed. Overall exposure ${Math.round(b * 100)}% → ${Math.round(a * 100)}%.`
        : 'No change for your tasks — they’re not referenced, or already at the 0–100% bounds in this scenario.',
    })
  }

  function removeSignal(id: string) {
    setState((s) => ({
      customSignals: s.customSignals.filter((c) => c.id !== id),
      appliedSignalIds: s.appliedSignalIds.filter((x) => x !== id),
    }))
    toast('Signal removed')
  }

  let lastMonth = ''

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow="Signals" title="What’s changing around your work?">
          Dated evidence that nudges task exposure up or down. Older signals fade with a 180-day half-life.
        </PageIntro>
        <PButton variant="secondary" onClick={() => setAdminOpen(true)}>
          <ShieldPlus aria-hidden />
          Admin
        </PButton>
      </div>

      <AnimatePresence>
        {(pending.length > 0 || state.recentlyChanged.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-8 flex flex-col gap-4 rounded-[20px] border border-teal/30 bg-mint p-5 md:flex-row md:items-center md:justify-between">
              {pending.length > 0 ? (
                <>
                  <p className="text-sm">
                    <span className="font-medium">{pending.length} new signal{pending.length > 1 ? 's' : ''}</span> ready to apply to your task map.
                  </p>
                  <PButton onClick={recompute} loading={computing} disabled={computing}>
                    {!computing && <RefreshCw aria-hidden />}
                    {computing ? 'Recomputing…' : 'Recompute task map'}
                  </PButton>
                </>
              ) : (
                <>
                  <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    {state.recentlyChanged.map((c) => (
                      <li key={c.taskId} className="flex items-center gap-2">
                        <span className="font-medium">{taskById[c.taskId]?.name ?? 'Custom task'}</span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {Math.round(c.before * 100)}% → {Math.round(c.after * 100)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/map" className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    View on map <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-10 flex flex-wrap items-center gap-3">
        <SegmentedControl
          label="Direction"
          size="sm"
          value={dir}
          onChange={setDir}
          options={[
            { value: 'all', label: 'All' },
            { value: 'up', label: 'Raises' },
            { value: 'down', label: 'Lowers' },
          ]}
        />
        <SegmentedControl
          label="Recency"
          size="sm"
          value={rec}
          onChange={setRec}
          options={[
            { value: 'all', label: 'Any time' },
            { value: '90', label: '90d' },
            { value: '180', label: '6 mo' },
            { value: '365', label: '1 yr' },
          ]}
        />
        <span className="ml-auto font-mono text-xs text-muted-foreground">
          {filtered.length} signals · as of {fmt(DATA_AS_OF)}
        </span>
      </div>

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-foreground">Published source</span> signals summarise public reports.{' '}
        <span className="font-medium text-foreground">Illustrative</span> signals are seeded demo records linked to related product or research pages; their strengths and task mappings are not verified evidence.
      </p>

      {filtered.length === 0 ? (
        <EmptyState className="mt-10" title="No signals match these filters" description="Try widening the time range or showing both directions." />
      ) : (
        <ol className="relative mt-10 flex flex-col gap-4">
          <span aria-hidden className="absolute bottom-4 left-[84px] top-4 hidden border-l-2 border-dotted border-border-strong sm:block" />
          {filtered.map((s) => {
            const month = s.date.slice(0, 7)
            const showMonth = month !== lastMonth
            lastMonth = month
            const isPending = s.evidence === 'user' && !state.appliedSignalIds.includes(s.id)
            const weight = recency(ageDays(s.date))
            const touchesMine = s.impacts.some((i) => mine.has(i.taskId))
            return (
              <motion.li key={s.id} layout className="grid gap-3 sm:grid-cols-[72px_24px_1fr] sm:gap-4">
                <div className="hidden pt-5 text-right sm:block">
                  {showMonth && (
                    <time dateTime={month} className="font-sans text-xs font-medium text-muted-foreground">
                      {new Date(s.date).toLocaleDateString('en-GB', { month: 'short' })}
                      <br />
                      {s.date.slice(0, 4)}
                    </time>
                  )}
                </div>
                <div className="relative hidden justify-center pt-6 sm:flex">
                  <span className={cn('relative z-10 size-3 rounded-full border-2 bg-background', touchesMine ? 'border-teal' : 'border-border-strong')} />
                </div>
                <article className={cn('card-surface card-lift flex flex-col gap-3 p-5', touchesMine && 'border-teal/25')}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <time dateTime={s.date} className="font-mono text-xs text-muted-foreground">
                        {fmt(s.date)}
                      </time>
                      <EvidenceBadge evidence={s.evidence} />
                      {isPending && <span className="rounded-full bg-exp-mid/50 px-2 py-0.5 text-[11px] font-medium text-exp-ink">Pending recompute</span>}
                    </div>
                    <DirectionBadge direction={s.direction} />
                  </div>
                  <h2 className="font-serif text-xl leading-snug text-pretty">{s.headline}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{s.explanation}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {s.impacts.map((i) => (
                      <span
                        key={i.taskId}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs',
                          mine.has(i.taskId) ? 'border-teal/40 bg-mint text-accent-foreground' : 'border-border bg-subtle text-muted-foreground',
                        )}
                      >
                        {taskById[i.taskId]?.name ?? i.taskId}
                      </span>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                    <a
                      href={s.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {s.sourceName}
                      <ExternalLink className="size-3.5" aria-hidden />
                      <span className="sr-only">(opens in a new tab)</span>
                    </a>
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-2" aria-label={`Strength ${Math.round(s.strength * 100)}%`}>
                        <span className="font-sans text-xs font-medium text-faint">Strength</span>
                        <span className="flex gap-0.5" aria-hidden>
                          {[0.2, 0.4, 0.6, 0.8, 1].map((t) => (
                            <span key={t} className={cn('h-3 w-1.5 rounded-sm', s.strength >= t - 0.1 ? 'bg-teal' : 'bg-border')} />
                          ))}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] text-faint" title="recency = 0.5 ^ (age_days / 180)">
                        weight {weight.toFixed(2)}
                      </span>
                      {s.evidence === 'user' && (
                        <button
                          type="button"
                          onClick={() => removeSignal(s.id)}
                          aria-label="Remove signal"
                          className="grid size-9 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-foreground"
                        >
                          <Trash2 className="size-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              </motion.li>
            )
          })}
        </ol>
      )}

      <AdminSheet open={adminOpen} onOpenChange={setAdminOpen} state={state} />
    </div>
  )
}
