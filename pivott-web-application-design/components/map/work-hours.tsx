'use client'

import { NumberField } from '@/components/pivott/number-field'
import type { Classification, ScoredTask } from '@/lib/engine'
const classes: { label: Classification; color: string }[] = [{ label: 'Automate', color: 'var(--exp-high)' }, { label: 'Augment', color: 'var(--exp-mid)' }, { label: 'Protect', color: 'var(--exp-low)' }]
export function WorkHours({ tasks, coverage, hours, onChange }: { tasks: ScoredTask[]; coverage: number; hours: number; onChange: (hours: number) => void }) {
  const values = classes.map((item) => ({ ...item, share: tasks.filter((task) => task.classification === item.label).reduce((sum, task) => sum + task.share, 0) * coverage }))
  const unknown = Math.max(0, 1 - coverage)
  return <section className="mt-8 border-t border-border pt-6" aria-labelledby="work-hours-title">
    <div className="flex flex-wrap items-center justify-between gap-4"><h2 id="work-hours-title" className="text-xl font-semibold">Your working week</h2><label className="flex items-center gap-3 text-sm">Work hours per week<NumberField className="w-24" min={1} max={168} value={hours} onCommit={onChange} /></label></div>
    <div role="img" aria-label={values.map((item) => `${item.label}: ${(item.share * hours).toFixed(1)} hours`).concat(unknown > 0 ? [`Unassessed: ${(unknown * hours).toFixed(1)} hours`] : []).join('; ')} className="mt-5 flex h-5 overflow-hidden rounded-md bg-subtle">{values.map((item) => <span key={item.label} style={{ width: `${item.share * 100}%`, backgroundColor: item.color }} />)}{unknown > 0 && <span style={{ width: `${unknown * 100}%`, backgroundImage: 'repeating-linear-gradient(135deg, var(--border-strong) 0 2px, transparent 2px 6px)' }} />}</div>
    <dl className="mt-4 grid grid-cols-3 gap-3">{values.map((item) => <div key={item.label}><dt className="text-sm text-muted-foreground">{item.label}</dt><dd className="mt-1 font-mono">{(item.share * hours).toFixed(1)} h</dd></div>)}</dl>
    {unknown > 0 && <p className="mt-3 text-sm text-muted-foreground">{(unknown * hours).toFixed(1)} h in unassessed tasks.</p>}
    <p className="mt-4 max-w-2xl text-xs text-muted-foreground">Illustrative allocation: where your time sits by task type, not a prediction of hours saved.</p>
  </section>
}
