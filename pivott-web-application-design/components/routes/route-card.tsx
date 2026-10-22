'use client'

import { ArrowRight } from 'lucide-react'
import { motion } from 'motion/react'
import { PButton } from '@/components/pivott/p-button'
import { exposureColor, type RouteResult } from '@/lib/engine'
import { roleById, skillById, tasksForRole } from '@/lib/data/seed'
import { cn } from '@/lib/utils'

export function ExposureCompare({ current, target }: { current: number | null; target: number }) {
  return (
    <div className="flex flex-col gap-2" role="group" aria-label="Exposure comparison">
      {[
        { label: 'Now', v: current },
        { label: 'Target', v: target },
      ].map((row) => (
        <div key={row.label} className="grid grid-cols-[48px_1fr_40px] items-center gap-2">
          <span className="font-sans text-xs font-medium text-faint">{row.label}</span>
          <span className="h-1.5 overflow-hidden rounded-full bg-subtle">
            <motion.span
              className="block h-full rounded-full"
              initial={false}
              animate={{ width: `${(row.v ?? 0) * 100}%`, backgroundColor: exposureColor(row.v ?? 0) }}
              transition={{ duration: 0.45 }}
            />
          </span>
          <span className="text-right font-mono text-xs tabular-nums">{row.v === null ? '—' : `${Math.round(row.v * 100)}%`}</span>
        </div>
      ))}
    </div>
  )
}

export function RouteCard({ route, rank, currentExposure, selected, onSelect, onWhy, onBuild, hoursPerWeek = 6, levels = {}, saved, onSave }: {
  route: RouteResult; rank: number; currentExposure: number | null; selected: boolean;
  onSelect: () => void; onWhy: () => void; onBuild: () => void; hoursPerWeek?: number;
  levels?: Record<string, number>; saved?: boolean; onSave?: () => void;
}) {
  const role = roleById[route.roleId]
  const unknown = route.unknownSkillIds.length
  const rated = role.requirements.length - unknown
  const transfers = role.requirements.filter((requirement) => levels[requirement.skillId] >= requirement.requiredLevel).map((requirement) => skillById[requirement.skillId].name)
  return (
    <article aria-labelledby={`route-${route.roleId}`} className={cn('card-surface flex flex-col gap-5 p-5', selected && 'border-primary')}>
      <div>
        {rank === 0 && <p className="mb-2 text-xs font-medium text-primary">{unknown ? 'First suggested route · Incomplete ratings' : 'Closest match in this dataset'}</p>}
        <h2 id={`route-${route.roleId}`} className="text-xl font-semibold">{route.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Work includes {tasksForRole(route.roleId).slice(0, 2).map((task) => task.name.toLowerCase()).join(' and ')}.</p>
      </div>
      <div><h3 className="text-sm font-medium">Why it fits</h3><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{transfers.length ? `Your rated skills include ${transfers.slice(0, 3).join(', ')}.` : route.similarity ? 'Some skills used in your selected tasks also appear in this role.' : 'This is an exploratory comparison, rather than a strong overlap.'} {rated ? `${Math.round(route.fit)}% fit based on rated skills and task overlap.` : 'No skill match is shown until you rate relevant skills.'}</p></div>
      {unknown > 0 && <p className="text-sm text-muted-foreground">Rate {unknown} more {unknown === 1 ? 'skill' : 'skills'} to complete this comparison. Unknown skills are excluded, not treated as zero.</p>}
      <div><h3 className="text-sm font-medium">Skills to develop</h3><p className="mt-1 text-sm text-muted-foreground">{route.gaps.slice(0, 3).map((gap) => gap.name).join(', ') || (unknown ? 'Rate the remaining skills to identify gaps.' : 'No gaps identified from your ratings.')}</p></div>
      <div><h3 className="text-sm font-medium">Learning estimate</h3><p className="mt-1 text-sm text-muted-foreground">{rated ? `${unknown ? 'At least ' : 'About '}${route.weeks} weeks at ${hoursPerWeek} hours/week.${unknown ? ' Unrated skills may add learning time.' : ' Based on the stored learning-hour estimates.'}` : 'Not estimated until relevant skills are rated.'}</p></div>
      <ExposureCompare current={currentExposure} target={route.targetExposure} />
      <div className="mt-auto flex flex-col gap-2">
        <PButton variant="secondary" onClick={onWhy}>View route</PButton>
        <PButton onClick={selected ? onBuild : onSelect}>{selected ? 'Build my plan' : 'Choose this route'}<ArrowRight aria-hidden /></PButton>
        {onSave && <button type="button" onClick={onSave} aria-pressed={saved} className="min-h-10 text-sm text-primary">{saved ? 'Saved · Remove' : 'Save for comparison'}</button>}
      </div>
    </article>
  )
}
