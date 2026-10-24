'use client'

import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { classify, exposureColor, scoreTasks, type Classification } from '@/lib/engine'
import { signals, taskById, tasksForRole } from '@/lib/data/seed'
import { cn } from '@/lib/utils'

interface HeroNode {
  id: string
  label: string
  x: number
  y: number
  r: number
  exposure: number
  judgment: number
  showLabel?: boolean
}

const W = 560
const H = 480
const CENTER = { x: 282, y: 246 }

// Use the same Finance Admin data and Normal scenario as View an example.
const positions: Record<string, { x: number; y: number }> = {
  'fa-invoice': { x: 128, y: 112 },
  'fa-recon': { x: 290, y: 88 },
  'fa-exception': { x: 440, y: 148 },
  'fa-reporting': { x: 435, y: 340 },
  'fa-comms': { x: 150, y: 365 },
  'fa-expense': { x: 78, y: 252 },
}
const nodes: HeroNode[] = scoreTasks(
  tasksForRole('finance-admin').map((task) => ({ taskId: task.id, share: task.defaultShare })),
  taskById, 'normal', signals,
).map((task) => ({
  id: task.id, label: task.name, ...positions[task.id],
  r: 100 * Math.sqrt(task.share), exposure: task.exposure,
  judgment: task.humanJudgment, showLabel: true,
}))

const skills = [
  { label: 'Controls', x: 365, y: 227 },
  { label: 'Spreadsheets', x: 170, y: 196 },
  { label: 'Stakeholders', x: 236, y: 330 },
]

function curve(a: { x: number; y: number }, b: { x: number; y: number }) {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  return `M${a.x} ${a.y} Q${mx - dy * 0.18} ${my + dx * 0.18} ${b.x} ${b.y}`
}

export function LivingTaskMap() {
  const reduce = useReducedMotion()
  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const active = pinned ?? hovered
  const current = nodes.find((n) => n.id === active) ?? null
  const cls: Classification | null = current ? classify(current.exposure, current.judgment) : null

  return (
    <div className="task-atlas relative mx-auto w-full max-w-[620px] overflow-hidden rounded-xl border border-border bg-card">
      <div className="relative z-10 flex items-start justify-between gap-3 border-b border-border px-5 py-4 sm:px-7">
        <div><p className="text-sm font-semibold">Finance Admin · Example</p><p className="mt-1 text-xs text-muted-foreground">Select a task to see how it could change.</p></div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-2.5 py-1 text-xs text-accent-foreground"><span className="size-1.5 rounded-full bg-primary" aria-hidden />Task map</span>
      </div>
      <div className="relative aspect-[56/48]">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full touch-manipulation overflow-visible" aria-labelledby="ltm-title ltm-desc" role="group">
        <title id="ltm-title">Living task map</title>
        <desc id="ltm-desc">An example map of a Finance Admin’s tasks, sized by time and coloured by AI exposure.</desc>

        <g aria-hidden>
          {nodes.map((n) => (
            <path
              key={`p-${n.id}`}
              d={curve(CENTER, n)}
              fill="none"
              stroke="var(--teal)"
              strokeWidth={1.5}
              strokeDasharray="3 5"
              strokeLinecap="round"
              className="transition-opacity duration-300"
              opacity={active && active !== n.id ? 0.15 : active === n.id ? 0.95 : 0.45}
            />
          ))}
          {skills.map((s) => (
            <g key={s.label}>
              <rect x={s.x - 4} y={s.y - 4} width={8} height={8} rx={2} transform={`rotate(45 ${s.x} ${s.y})`} fill="var(--card)" stroke="var(--teal)" strokeWidth={1.2} />
              <text x={s.x + 10} y={s.y + 3.5} className="fill-muted-foreground font-sans" fontSize={10}>
                {s.label}
              </text>
            </g>
          ))}
        </g>

        {nodes.map((n, index) => {
          const isActive = active === n.id
          const dim = active !== null && !isActive
          const c = classify(n.exposure, n.judgment)
          return (
            <motion.g key={n.id}
              initial={reduce ? false : { opacity: 0, x: CENTER.x - n.x, y: CENTER.y - n.y }}
              whileInView={{ opacity: 1, x: 0, y: 0 }} viewport={{ once: true }}
              transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 220, damping: 25, delay: index * 0.06 }}
            >
              <g
                tabIndex={0}
                role="button"
                aria-label={`${n.label}: ${Math.round(n.exposure * 100)}% exposure, ${c}`}
                aria-pressed={pinned === n.id}
                onClick={() => { setHovered(null); setPinned((value) => value === n.id ? null : n.id) }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setPinned((value) => value === n.id ? null : n.id)
                  }
                  if (event.key === 'Escape') { setPinned(null); setHovered(null) }
                }}
                onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(n.id)}
                onPointerLeave={(event) => event.pointerType === 'mouse' && setHovered(null)}
                onFocus={() => setHovered(n.id)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none transition-opacity duration-300 [&:focus-visible>circle:first-child]:stroke-ring [&:focus-visible>circle:first-child]:stroke-2"
                opacity={dim ? 0.55 : 1}
              >
                <circle cx={n.x} cy={n.y} r={Math.max(44, n.r)} fill="transparent" data-tap-target />
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isActive ? n.r + 4 : n.r}
                  fill={exposureColor(n.exposure)}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                  style={{ transition: 'r 250ms cubic-bezier(.2,.7,.2,1)' }}
                />
                <circle cx={n.x} cy={n.y} r={n.r - 5} fill="none" stroke="var(--exp-ink)" strokeOpacity="0.1" pointerEvents="none" />
                {n.showLabel && n.r >= 34 && (
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} className="pointer-events-none fill-exp-ink font-sans">
                    {Math.round(n.exposure * 100)}%
                  </text>
                )}
                {n.showLabel && (
                  <text
                    x={n.x}
                    y={n.y + n.r + 16}
                    textAnchor="middle"
                    fontSize={11.5}
                    className="pointer-events-none fill-muted-foreground font-sans"
                  >
                    {n.label}
                  </text>
                )}
              </g>
            </motion.g>
          )
        })}

        <g aria-hidden>
          <circle cx={CENTER.x} cy={CENTER.y} r={22} fill="var(--card)" stroke="var(--border-strong)" />
          <text x={CENTER.x} y={CENTER.y + 4} textAnchor="middle" fontSize="11" className="fill-primary font-sans" fontWeight="600">You</text>

        </g>
      </svg>

      <AnimatePresence>
        {current && cls && (
          <motion.div
            key={current.id}
            role="tooltip"
            initial={reduce ? false : { opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: reduce ? 0 : 0.16 }}
            className={cn(
              'surface-panel pointer-events-none absolute z-10 w-48 -translate-x-1/2 rounded-xl p-3',
            )}
            style={{
              left: `${(Math.min(Math.max(current.x, 100), W - 100) / W) * 100}%`,
              top: `${((current.y > H / 2 ? current.y - current.r - 104 : current.y + current.r + 12) / H) * 100}%`,
            }}
          >
            <p className="text-sm font-medium text-foreground">{current.label}</p>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-muted-foreground">{Math.round(current.exposure * 100)}% exposure</span>
              <span className="text-xs font-medium text-primary">{cls}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-xs text-muted-foreground sm:px-7">
        <a href="/method" className="underline">How scores work</a>
        <span className="flex items-center gap-2"><span>Lower</span><span className="flex gap-1" aria-hidden><i className="size-2.5 rounded-full bg-exp-low" /><i className="size-2.5 rounded-full bg-exp-mid" /><i className="size-2.5 rounded-full bg-exp-high" /></span><span>Higher</span></span>
      </div>
    </div>
  )
}
