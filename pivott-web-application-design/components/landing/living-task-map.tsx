'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { classify, exposureColor, type Classification } from '@/lib/engine'
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

const nodes: HeroNode[] = [
  { id: 'invoice', label: 'Invoice entry', x: 128, y: 118, r: 50, exposure: 0.82, judgment: 0.15, showLabel: true },
  { id: 'exception', label: 'Exception handling', x: 432, y: 112, r: 36, exposure: 0.36, judgment: 0.68, showLabel: true },
  { id: 'analysis', label: 'Data analysis', x: 446, y: 318, r: 42, exposure: 0.52, judgment: 0.45, showLabel: true },
  { id: 'comms', label: 'Client communication', x: 146, y: 372, r: 38, exposure: 0.26, judgment: 0.72, showLabel: true },
  { id: 'reporting', label: 'Reporting', x: 310, y: 418, r: 28, exposure: 0.59, judgment: 0.42, showLabel: true },
  { id: 'automation', label: 'Process automation', x: 296, y: 88, r: 24, exposure: 0.44, judgment: 0.5, showLabel: true },
  { id: 'recon', label: 'Bank reconciliation', x: 70, y: 252, r: 26, exposure: 0.69, judgment: 0.3 },
  { id: 'expense', label: 'Expense review', x: 506, y: 214, r: 20, exposure: 0.66, judgment: 0.38 },
  { id: 'vendor', label: 'Vendor queries', x: 214, y: 254, r: 16, exposure: 0.48, judgment: 0.55 },
]

const skills = [
  { label: 'Controls', x: 378, y: 200 },
  { label: 'SQL', x: 196, y: 186 },
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
  const [active, setActive] = useState<string | null>(null)
  const current = nodes.find((n) => n.id === active) ?? null
  const cls: Classification | null = current ? classify(current.exposure, current.judgment) : null

  return (
    <div className="relative mx-auto aspect-[56/48] w-full max-w-[600px]">
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" aria-labelledby="ltm-title ltm-desc" role="group">
        <title id="ltm-title">Living task map</title>
        <desc id="ltm-desc">An illustrative map of a Finance Admin’s tasks, sized by time and coloured by AI exposure.</desc>
        <defs>
          <radialGradient id="ltm-hl" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.65" />
            <stop offset="60%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
        </defs>

        <g aria-hidden>
          {nodes.map((n) => (
            <path
              key={`p-${n.id}`}
              d={curve(CENTER, n)}
              fill="none"
              stroke="var(--teal)"
              strokeWidth={1.25}
              strokeDasharray="1 6"
              strokeLinecap="round"
              className="route-flow transition-opacity duration-300"
              opacity={active && active !== n.id ? 0.15 : active === n.id ? 0.95 : 0.45}
            />
          ))}
          {skills.map((s) => (
            <g key={s.label}>
              <rect x={s.x - 4} y={s.y - 4} width={8} height={8} rx={2} transform={`rotate(45 ${s.x} ${s.y})`} fill="var(--card)" stroke="var(--teal)" strokeWidth={1.2} />
              <text x={s.x + 10} y={s.y + 3.5} className="fill-muted-foreground font-mono" fontSize={10}>
                {s.label}
              </text>
            </g>
          ))}
        </g>

        {nodes.map((n, i) => {
          const isActive = active === n.id
          const dim = active !== null && !isActive
          const c = classify(n.exposure, n.judgment)
          return (
            <g
              key={n.id}
              className="float-node"
              style={{ animationDelay: `${-i * 0.9}s`, animationDuration: `${6 + (i % 3)}s` }}
            >
              <g
                tabIndex={0}
                role="button"
                aria-label={`${n.label}: ${Math.round(n.exposure * 100)}% illustrative exposure, ${c}`}
                onMouseEnter={() => setActive(n.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(n.id)}
                onBlur={() => setActive(null)}
                className="cursor-pointer outline-none transition-opacity duration-300 [&:focus-visible>circle:first-child]:stroke-ring [&:focus-visible>circle:first-child]:stroke-2"
                opacity={dim ? 0.55 : 1}
              >
                <circle
                  cx={n.x}
                  cy={n.y}
                  r={isActive ? n.r + 4 : n.r}
                  fill={exposureColor(n.exposure)}
                  stroke="var(--card)"
                  strokeWidth={1.5}
                  style={{ transition: 'r 250ms cubic-bezier(.2,.7,.2,1)', filter: 'drop-shadow(0 6px 14px rgba(15,50,46,0.12))' }}
                />
                <circle cx={n.x} cy={n.y} r={n.r} fill="url(#ltm-hl)" pointerEvents="none" />
                {n.showLabel && n.r >= 34 && (
                  <text x={n.x} y={n.y + 4} textAnchor="middle" fontSize={11} className="pointer-events-none fill-exp-ink font-mono">
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
            </g>
          )
        })}

        <g aria-hidden>
          <circle cx={CENTER.x} cy={CENTER.y} r={22} fill="var(--card)" stroke="var(--border-strong)" />
          <circle cx={CENTER.x} cy={CENTER.y} r={7} fill="var(--teal)" />
          <circle cx={CENTER.x} cy={CENTER.y} r={14} fill="none" stroke="var(--teal)" strokeOpacity={0.35} strokeDasharray="1 4" strokeLinecap="round" />
        </g>
      </svg>

      <AnimatePresence>
        {current && cls && (
          <motion.div
            key={current.id}
            role="tooltip"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.16 }}
            className={cn(
              'pointer-events-none absolute z-10 w-48 -translate-x-1/2 rounded-2xl border border-border bg-card/95 p-3 shadow-lift backdrop-blur',
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
            <p className="mt-1.5 font-mono text-[10px] uppercase tracking-wider text-faint">Illustrative</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
