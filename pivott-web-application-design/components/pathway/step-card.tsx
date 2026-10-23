'use client'

import { Clock, ExternalLink, FileCheck2 } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { SkillChip } from '@/components/pivott/badges'
import type { PathwayStep } from '@/lib/engine'
import { cn } from '@/lib/utils'

export function StepCard({
  step,
  done,
  onToggle,
  taskNames,
  roleTitle,
}: {
  step: PathwayStep
  done: boolean
  onToggle: () => void
  taskNames: string[]
  roleTitle: string
}) {
  const reduce = useReducedMotion()
  const weeks = step.startWeek === step.endWeek ? `Week ${step.startWeek}` : `Weeks ${step.startWeek}–${step.endWeek}`
  return (
    <li className="relative grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-[56px_1fr]">
      <div className="relative z-10 flex justify-center pt-6">
        <button
          type="button"
          role="checkbox"
          aria-checked={done}
          aria-label={`Mark “${step.title}” as ${done ? 'not done' : 'done'}`}
          onClick={onToggle}
          className={cn(
            'relative grid size-11 place-items-center rounded-full border-2 bg-background transition-colors duration-200 after:absolute after:-inset-1.5',
            done ? 'border-teal bg-teal text-card' : 'border-border-strong hover:border-teal',
          )}
        >
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <motion.path
              d="M5 12.5l4.5 4.5L19 7.5"
              initial={false}
              animate={{ pathLength: done ? 1 : 0, opacity: done ? 1 : 0 }}
              transition={{ duration: reduce ? 0 : 0.28, ease: 'easeOut' }}
            />
          </svg>
        </button>
      </div>

      <article className={cn('card-surface card-lift flex flex-col gap-4 p-5 sm:p-6', done && 'bg-card/70')}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="font-mono text-xs uppercase tracking-wider text-primary">{weeks}</span>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground">
              <Clock className="size-3.5" aria-hidden />
              {step.hours} h
            </span>
            {step.resource && (
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-medium',
                  step.resource.free ? 'bg-mint text-accent-foreground' : 'bg-sky text-foreground',
                )}
              >
                {step.resource.free ? 'Free' : 'Paid'}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h3 className={cn('font-serif text-2xl leading-tight', done && 'text-muted-foreground line-through decoration-teal/60 decoration-1')}>
            {step.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">{taskNames.length ? `Used in ${taskNames.length} of your tasks (${taskNames.join(', ')}). ` : 'Not listed in your selected tasks. '}{roleTitle} needs level {step.required}; you are at level {step.current}.</p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {step.skills.map((s) => (
            <SkillChip key={s} skillId={s} tone="teal" />
          ))}
        </div>

        <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          {step.resource ? (
            <a
              href={step.resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex min-h-11 items-start gap-2 rounded-lg text-sm"
            >
              <ExternalLink className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <span className="flex flex-col">
                <span className="font-medium group-hover:underline">{step.resource.title}</span>
                <span className="text-xs text-muted-foreground">{step.resource.provider}</span>
              </span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No free resource stored for this skill yet.</p>
          )}
          <p className="flex items-start gap-2 text-sm">
            <FileCheck2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>
              <span className="block text-xs text-muted-foreground">Deliverable</span>
              {step.deliverable}
            </span>
          </p>
        </div>
      </article>
    </li>
  )
}
