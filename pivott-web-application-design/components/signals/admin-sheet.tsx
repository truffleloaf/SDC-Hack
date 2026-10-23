'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { PButton } from '@/components/pivott/p-button'
import { SegmentedControl } from '@/components/pivott/segmented-control'
import { ValueSlider } from '@/components/pivott/value-slider'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { DATA_AS_OF, tasks, type Signal } from '@/lib/data/seed'
import { setState, type AppState } from '@/lib/store'
import { cn } from '@/lib/utils'

const field =
  'h-11 w-full rounded-xl border border-border-strong bg-background px-3 text-sm outline-none focus-visible:border-teal focus-visible:ring-4 focus-visible:ring-teal/15 aria-invalid:border-destructive'

export function AdminSheet({ open, onOpenChange, state }: { open: boolean; onOpenChange: (o: boolean) => void; state: AppState }) {
  const [headline, setHeadline] = useState('')
  const [sourceName, setSourceName] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [date, setDate] = useState(DATA_AS_OF)
  const [direction, setDirection] = useState<'1' | '-1'>('1')
  const [strength, setStrength] = useState(0.6)
  const [impact, setImpact] = useState(0.15)
  const [explanation, setExplanation] = useState('')
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)

  const mine = new Set(state.selections.map((s) => s.taskId))
  const ordered = [...tasks].sort((a, b) => Number(mine.has(b.id)) - Number(mine.has(a.id)))

  const urlValid = /^https:\/\/[^\s]+\.[^\s]+$/.test(sourceUrl.trim())
  const errors = {
    headline: headline.trim().length < 8,
    sourceName: !sourceName.trim(),
    sourceUrl: !urlValid,
    date: !date || date > DATA_AS_OF,
    tasks: taskIds.length === 0,
  }
  const valid = !Object.values(errors).some(Boolean)

  function reset() {
    setHeadline('')
    setSourceName('')
    setSourceUrl('')
    setDate(DATA_AS_OF)
    setDirection('1')
    setStrength(0.6)
    setImpact(0.15)
    setExplanation('')
    setTaskIds([])
    setSubmitted(false)
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitted(true)
    if (!valid) return
    const signal: Signal = {
      id: `user-${Date.now().toString(36)}`,
      date,
      headline: headline.trim().slice(0, 140),
      sourceName: sourceName.trim().slice(0, 60),
      sourceUrl: sourceUrl.trim(),
      direction: direction === '1' ? 1 : -1,
      strength: Math.round(strength * 100) / 100,
      impacts: taskIds.map((taskId) => ({ taskId, impact: Math.round(impact * 100) / 100 })),
      explanation: explanation.trim().slice(0, 200) || 'Added manually by an admin.',
      evidence: 'user',
    }
    setState((s) => ({ customSignals: [...s.customSignals, signal] }))
    toast.success('Signal added', { description: 'Recompute your task map to apply it.' })
    reset()
    onOpenChange(false)
  }

  const show = (k: keyof typeof errors) => submitted && errors[k]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        <form onSubmit={submit} noValidate className="flex min-h-full flex-col">
          <SheetHeader className="border-b border-border p-6">
            <p className="font-sans text-xs font-medium text-primary">Admin</p>
            <SheetTitle className="font-serif text-3xl font-normal">Add a signal</SheetTitle>
            <SheetDescription>Your entries are labelled “Added by you”. Dated entries fade with a 180-day half-life; all adjustments together are capped at ±20 points.</SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 p-6">
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Headline</span>
              <input className={field} value={headline} onChange={(e) => setHeadline(e.target.value)} aria-invalid={show('headline') || undefined} placeholder="What changed?" />
              {show('headline') && <span className="text-xs text-destructive">Add a short headline (8+ characters).</span>}
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Source name</span>
                <input className={field} value={sourceName} onChange={(e) => setSourceName(e.target.value)} aria-invalid={show('sourceName') || undefined} placeholder="e.g. OECD" />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-medium">Date</span>
                <input type="date" className={cn(field, 'font-mono')} value={date} max={DATA_AS_OF} onChange={(e) => setDate(e.target.value)} aria-invalid={show('date') || undefined} />
              </label>
            </div>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Source link</span>
              <input type="url" inputMode="url" className={cn(field, 'font-mono')} value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} aria-invalid={show('sourceUrl') || undefined} placeholder="https://" />
              {show('sourceUrl') && <span className="text-xs text-destructive">Use a full https:// link.</span>}
            </label>

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Direction</span>
              <SegmentedControl
                label="Direction"
                value={direction}
                onChange={setDirection}
                options={[
                  { value: '1', label: 'Raises exposure' },
                  { value: '-1', label: 'Lowers exposure' },
                ]}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col">
                <span className="flex justify-between text-sm font-medium">
                  Strength <span className="font-mono text-muted-foreground">{strength.toFixed(2)}</span>
                </span>
                <ValueSlider label="Strength" value={strength} min={0.1} max={1} step={0.05} format={(v) => v.toFixed(2)} onChange={setStrength} />
              </div>
              <div className="flex flex-col">
                <span className="flex justify-between text-sm font-medium">
                  Impact <span className="font-mono text-muted-foreground">{impact.toFixed(2)}</span>
                </span>
                <ValueSlider label="Impact per task" value={impact} min={0.05} max={0.4} step={0.01} format={(v) => v.toFixed(2)} onChange={setImpact} />
              </div>
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Affected tasks</legend>
              <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-border p-2">
                {ordered.map((t) => {
                  const on = taskIds.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setTaskIds((ids) => (on ? ids.filter((x) => x !== t.id) : [...ids, t.id]))}
                      className={cn(
                        'h-8 rounded-full border px-3 text-xs transition-colors',
                        on ? 'border-teal/50 bg-mint text-accent-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                        mine.has(t.id) && !on && 'border-border-strong text-foreground',
                      )}
                    >
                      {t.name}
                    </button>
                  )
                })}
              </div>
              {show('tasks') && <span className="text-xs text-destructive">Select at least one task.</span>}
            </fieldset>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Explanation <span className="font-normal text-muted-foreground">(optional)</span></span>
              <textarea
                value={explanation}
                onChange={(e) => setExplanation(e.target.value)}
                rows={3}
                maxLength={200}
                className="w-full rounded-xl border border-border-strong bg-background p-3 text-sm leading-relaxed outline-none focus-visible:border-teal focus-visible:ring-4 focus-visible:ring-teal/15"
              />
            </label>
          </div>

          <SheetFooter className="mt-auto flex-row justify-end gap-2 border-t border-border p-6">
            <PButton type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </PButton>
            <PButton type="submit">Add signal</PButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
