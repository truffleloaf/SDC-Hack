'use client'

import { ArrowRight, Check } from 'lucide-react'
import { motion } from 'motion/react'
import { SdgBadge, SkillChip } from '@/components/pivott/badges'
import { PButton } from '@/components/pivott/p-button'
import { CountUp, ProgressRing } from '@/components/pivott/progress-ring'
import { exposureColor, type RouteResult } from '@/lib/engine'
import { cn } from '@/lib/utils'

export function ExposureCompare({ current, target }: { current: number; target: number }) {
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
              animate={{ width: `${row.v * 100}%`, backgroundColor: exposureColor(row.v) }}
              transition={{ duration: 0.45 }}
            />
          </span>
          <span className="text-right font-mono text-xs tabular-nums">{Math.round(row.v * 100)}%</span>
        </div>
      ))}
    </div>
  )
}

export function RouteCard({
  route,
  rank,
  currentExposure,
  selected,
  onSelect,
  onWhy,
  onBuild,
}: {
  route: RouteResult
  rank: number
  currentExposure: number
  selected: boolean
  onSelect: () => void
  onWhy: () => void
  onBuild: () => void
}) {
  return (
    <motion.article
      layout
      transition={{ layout: { type: 'spring', stiffness: 260, damping: 30 } }}
      aria-labelledby={`route-${route.roleId}`}
      className={cn(
        'card-surface card-lift relative flex flex-col gap-6 p-6',
        selected && 'border-teal/60 ring-4 ring-teal/10',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          {rank === 0 && (
            <span className="mb-1 inline-flex w-fit items-center gap-1 rounded-full bg-mint px-2 py-0.5 text-[11px] font-medium text-accent-foreground">
              <span className="size-1.5 rounded-full bg-teal" aria-hidden />
              Closest match
            </span>
          )}
          <h2 id={`route-${route.roleId}`} className="font-serif text-2xl leading-tight">
            {route.title}
          </h2>
          <p className="text-sm text-muted-foreground">{route.family}</p>
        </div>
        <ProgressRing value={route.fit / 100} size={68} stroke={5} label={`${route.title} skill match`}>
          <span className="font-serif text-xl leading-none">
            <CountUp value={route.fit} format={(n) => `${Math.round(n)}`} />
            <span className="text-xs text-muted-foreground">%</span>
          </span>
        </ProgressRing>
      </div>

      <dl className="grid grid-cols-2 gap-4 border-y border-border py-4">
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-xs font-medium text-faint">Prepare</dt>
          <dd className="font-serif text-2xl leading-none">
            {route.weeks} <span className="font-sans text-sm text-muted-foreground">weeks</span>
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="font-sans text-xs font-medium text-faint">Skill gaps</dt>
          <dd className="font-serif text-2xl leading-none">{route.gaps.length}</dd>
        </div>
      </dl>

      <ExposureCompare current={currentExposure} target={route.targetExposure} />

      <div className="flex flex-col gap-2">
        <p className="font-sans text-xs font-medium text-faint">Top gaps</p>
        <div className="flex flex-wrap gap-1.5">
          {route.gaps.slice(0, 2).map((g) => (
            <SkillChip key={g.skillId} label={`${g.name} · +${g.gap}`} tone="peach" />
          ))}
          {route.gaps.length === 0 && <span className="text-sm text-muted-foreground">No gaps — you’re ready.</span>}
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            {route.sdgs.map((id) => (
              <SdgBadge key={id} id={id} />
            ))}
          </div>
          <button type="button" onClick={onWhy} className="min-h-9 rounded-md text-sm font-medium text-primary underline-offset-4 hover:underline">
            Why this score?
          </button>
        </div>
        {selected ? (
          <PButton onClick={onBuild} className="w-full">
            Build my plan
            <ArrowRight aria-hidden />
          </PButton>
        ) : (
          <PButton variant="secondary" onClick={onSelect} className="w-full">
            <Check aria-hidden />
            Choose this route
          </PButton>
        )}
      </div>
    </motion.article>
  )
}
