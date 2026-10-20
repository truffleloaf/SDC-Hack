'use client'

import { Check, Plus, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { SkillChip } from '@/components/pivott/badges'
import { PButton } from '@/components/pivott/p-button'
import { ValueSlider } from '@/components/pivott/value-slider'
import { skills, tasksForRole } from '@/lib/data/seed'
import { addTask, removeTask, setShare } from '@/lib/shares'
import { setState, type AppState } from '@/lib/store'
import { cn } from '@/lib/utils'

export function TaskPicker({ state }: { state: AppState }) {
  const roleTasks = tasksForRole(state.roleId!)
  const all = [
    ...roleTasks.map((t) => ({ id: t.id, name: t.name, description: t.description, skills: t.skills, custom: false })),
    ...state.customTasks.map((t) => ({ id: t.id, name: t.name, description: 'Your own task', skills: t.skills, custom: true })),
  ]
  const shareOf = (id: string) => state.selections.find((s) => s.taskId === id)?.share

  return (
    <div className="flex flex-col gap-3">
      <AnimatePresence initial={false}>
        {all.map((t, i) => {
          const share = shareOf(t.id)
          const checked = share !== undefined
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.25 } }}
              exit={{ opacity: 0, scale: 0.98 }}
              className={cn('card-surface flex flex-col gap-4 p-5', !checked && 'bg-card/60 shadow-none')}
            >
              <div className="flex items-start gap-4">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  aria-label={`Include ${t.name}`}
                  onClick={() =>
                    setState((s) => ({
                      selections: checked ? removeTask(s.selections, t.id) : addTask(s.selections, t.id),
                    }))
                  }
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors after:absolute after:-inset-2.5 relative',
                    checked ? 'border-teal bg-teal text-card' : 'border-border-strong bg-card hover:border-teal/60',
                  )}
                >
                  {checked && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
                </button>
                <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className={cn('font-medium', !checked && 'text-muted-foreground')}>{t.name}</h3>
                    {checked && (
                      <span className="font-mono text-sm tabular-nums text-foreground">{Math.round(share!)}%</span>
                    )}
                  </div>
                  <p className="text-sm leading-relaxed text-muted-foreground">{t.description}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {t.skills.map((s) => (
                      <SkillChip key={s} skillId={s} />
                    ))}
                  </div>
                </div>
                {t.custom && (
                  <button
                    type="button"
                    aria-label={`Remove ${t.name}`}
                    onClick={() =>
                      setState((s) => ({
                        customTasks: s.customTasks.filter((c) => c.id !== t.id),
                        selections: removeTask(s.selections, t.id),
                      }))
                    }
                    className="grid size-9 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-foreground"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              {checked && state.selections.length > 1 && (
                <div className="pl-10">
                  <ValueSlider
                    label={`Time share for ${t.name}`}
                    value={share!}
                    min={1}
                    max={100}
                    onChange={(v) => setState((s) => ({ selections: setShare(s.selections, t.id, v) }))}
                  />
                </div>
              )}
            </motion.div>
          )
        })}
      </AnimatePresence>
      <AddTask />
    </div>
  )
}

function AddTask() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [picked, setPicked] = useState<string[]>([])
  const suggestions = suggestSkills(name)

  function submit() {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = `custom-${Date.now().toString(36)}`
    setState((s) => ({
      customTasks: [
        ...s.customTasks,
        { id, name: trimmed.slice(0, 60), skills: picked.length ? picked : suggestions.slice(0, 2), baseExposure: 0.5, humanJudgment: 0.5 },
      ],
      selections: addTask(s.selections, id),
    }))
    setName('')
    setPicked([])
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-14 items-center justify-center gap-2 rounded-[20px] border border-dashed border-border-strong text-sm text-muted-foreground transition-colors hover:border-teal hover:bg-mint/50 hover:text-foreground"
      >
        <Plus className="size-4" aria-hidden />
        Add your own task
      </button>
    )
  }

  return (
    <motion.form
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
      className="card-surface flex flex-col gap-4 p-5"
    >
      <label className="flex flex-col gap-2">
        <span className="text-sm font-medium">Task name</span>
        <input
          autoFocus
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Payroll checks"
          className="h-11 rounded-xl border border-border-strong bg-background px-3 outline-none focus-visible:border-teal focus-visible:ring-4 focus-visible:ring-teal/15"
        />
      </label>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Skills it uses</legend>
        <div className="flex flex-wrap gap-1.5">
          {(name ? suggestions : skills.map((s) => s.id)).slice(0, 8).map((id) => {
            const on = picked.includes(id)
            return (
              <button
                key={id}
                type="button"
                aria-pressed={on}
                onClick={() => setPicked((p) => (on ? p.filter((x) => x !== id) : [...p, id]))}
                className="rounded-full"
              >
                <SkillChip skillId={id} tone={on ? 'teal' : 'neutral'} className="h-8 px-3" />
              </button>
            )
          })}
        </div>
      </fieldset>
      <p className="text-xs leading-relaxed text-muted-foreground">
        Custom tasks start at a neutral 50% base exposure until signals reference them.
      </p>
      <div className="flex justify-end gap-2">
        <PButton type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
          Cancel
        </PButton>
        <PButton type="submit" size="sm" disabled={!name.trim()}>
          Add task
        </PButton>
      </div>
    </motion.form>
  )
}

const keywordMap: Record<string, string[]> = {
  report: ['analysis', 'writing', 'excel'],
  data: ['analysis', 'sql', 'excel'],
  pay: ['controls', 'erp', 'excel'],
  client: ['stakeholder', 'empathy', 'writing'],
  customer: ['empathy', 'writing'],
  plan: ['coordination', 'process'],
  audit: ['controls', 'analysis'],
  email: ['writing', 'stakeholder'],
  automat: ['automation', 'process'],
  vendor: ['stakeholder', 'coordination'],
}

function suggestSkills(name: string) {
  const n = name.toLowerCase()
  const hits = Object.entries(keywordMap)
    .filter(([k]) => n.includes(k))
    .flatMap(([, v]) => v)
  const unique = Array.from(new Set([...hits, 'analysis', 'stakeholder', 'excel', 'process', 'ai', 'writing']))
  return unique
}
