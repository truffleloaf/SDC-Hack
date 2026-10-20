'use client'

import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ClassificationBadge, ExposureBadge, SkillChip } from '@/components/pivott/badges'
import { CopyButton } from '@/components/pivott/copy-button'
import { exposureColor, type ScoredTask } from '@/lib/engine'
import { cn } from '@/lib/utils'

interface LayoutNode extends SimulationNodeDatum {
  id: string
  r: number
}

function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return { ref, width }
}

function layout(tasks: ScoredTask[], W: number, H: number, prev: Map<string, { x: number; y: number }>) {
  const minDim = Math.min(W, H)
  const k = Math.sqrt((0.3 * W * H) / Math.PI)
  const minR = Math.max(18, minDim * 0.06)
  const maxR = minDim * 0.26
  const nodes: LayoutNode[] = tasks.map((t, i) => {
    const p = prev.get(t.id)
    const angle = i * 2.399963
    const dist = 0.18 * minDim * Math.sqrt(i + 0.5)
    return {
      id: t.id,
      r: Math.min(maxR, Math.max(minR, k * Math.sqrt(t.share))),
      x: p?.x ?? W / 2 + Math.cos(angle) * dist,
      y: p?.y ?? H / 2 + Math.sin(angle) * dist,
    }
  })
  const pad = 26
  const sim = forceSimulation(nodes)
    .force('x', forceX<LayoutNode>(W / 2).strength(0.05))
    .force('y', forceY<LayoutNode>(H / 2).strength(0.08))
    .force('collide', forceCollide<LayoutNode>((d) => d.r + pad).iterations(4))
    .stop()
  for (let i = 0; i < 320; i++) {
    sim.tick()
    for (const n of nodes) {
      n.x = Math.max(n.r + 8, Math.min(W - n.r - 8, n.x!))
      n.y = Math.max(n.r + 8, Math.min(H - n.r - 40, n.y!))
    }
  }
  return new Map(nodes.map((n) => [n.id, { x: n.x!, y: n.y!, r: n.r }]))
}

function splitLabel(name: string) {
  if (name.length <= 16) return [name]
  const words = name.split(' ')
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

export function TaskMapCanvas({
  tasks,
  highlightIds = [],
}: {
  tasks: ScoredTask[]
  highlightIds?: string[]
}) {
  const { ref, width } = useSize<HTMLDivElement>()
  const reduce = useReducedMotion()
  const W = Math.max(300, width)
  const H = Math.round(Math.min(560, Math.max(400, W * 0.6)))
  const wide = W >= 680

  const [hovered, setHovered] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string | null>(null)
  const prevRef = useRef(new Map<string, { x: number; y: number }>())

  const shareKey = tasks.map((t) => `${t.id}:${t.share.toFixed(3)}`).join('|')
  const positions = useMemo(() => {
    const result = layout(tasks, W, H, prevRef.current)
    prevRef.current = new Map([...result].map(([id, p]) => [id, { x: p.x, y: p.y }]))
    return result
    // Layout depends only on ids, shares, and canvas size — not on exposure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareKey, W, H])

  const activeId = hovered ?? pinned
  const active = tasks.find((t) => t.id === activeId) ?? null
  const activePos = active ? positions.get(active.id) : null

  useEffect(() => {
    if (!pinned) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPinned(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pinned])

  const cardOnLeft = activePos ? activePos.x > W / 2 : false
  const cardW = 288
  const cardX = cardOnLeft ? 20 : W - cardW - 20
  const cardY = 20
  const anchor = { x: cardOnLeft ? cardX + cardW : cardX, y: cardY + 44 }

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={ref}
        className="dot-grid relative w-full overflow-hidden rounded-2xl bg-subtle/60"
        style={{ height: H }}
        onClick={(e) => {
          if (e.target === e.currentTarget || (e.target as Element).tagName === 'svg') setPinned(null)
        }}
      >
        {width > 0 && (
          <svg
            width={W}
            height={H}
            className="absolute inset-0"
            role="group"
            aria-label={`Task map with ${tasks.length} tasks. Bubble size shows time share; the filled core shows exposure.`}
          >
            <defs>
              <radialGradient id="tm-hl" cx="32%" cy="28%" r="75%">
                <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
                <stop offset="55%" stopColor="#fff" stopOpacity="0" />
              </radialGradient>
              <filter id="tm-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#0f322e" floodOpacity="0.12" />
              </filter>
              <filter id="tm-shadow-lift" x="-30%" y="-30%" width="160%" height="170%">
                <feDropShadow dx="0" dy="12" stdDeviation="12" floodColor="#0f322e" floodOpacity="0.22" />
              </filter>
            </defs>

            {wide && active && activePos && (
              <motion.path
                key={active.id}
                d={`M${activePos.x} ${activePos.y} Q${(activePos.x + anchor.x) / 2} ${Math.min(activePos.y, anchor.y) - 30} ${anchor.x} ${anchor.y}`}
                fill="none"
                stroke="var(--teal)"
                strokeWidth={1.5}
                strokeDasharray="1 6"
                strokeLinecap="round"
                initial={reduce ? false : { pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            )}

            {tasks.map((t) => {
              const p = positions.get(t.id)
              if (!p) return null
              const isActive = activeId === t.id
              const dim = activeId !== null && !isActive
              const color = exposureColor(t.exposure)
              const lines = splitLabel(t.name)
              const inside = p.r >= 44 && Math.max(...lines.map((l) => l.length)) * 7.4 < p.r * 1.7
              const highlighted = highlightIds.includes(t.id)
              return (
                <motion.g
                  key={t.id}
                  initial={reduce ? false : { x: W / 2, y: H / 2, opacity: 0 }}
                  animate={{ x: p.x, y: p.y - (isActive ? 4 : 0), opacity: dim ? 0.6 : 1 }}
                  transition={{ type: 'spring', stiffness: 170, damping: 24 }}
                >
                  <g
                    tabIndex={0}
                    role="button"
                    aria-pressed={pinned === t.id}
                    aria-label={`${t.name}: ${Math.round(t.exposure * 100)}% exposure, ${t.classification}, ${Math.round(t.share * 100)}% of your time`}
                    className="cursor-pointer outline-none [&:focus-visible_.ring]:opacity-100"
                    onMouseEnter={() => setHovered(t.id)}
                    onMouseLeave={() => setHovered(null)}
                    onFocus={() => setHovered(t.id)}
                    onBlur={() => setHovered(null)}
                    onClick={(e) => {
                      e.stopPropagation()
                      setPinned((cur) => (cur === t.id ? null : t.id))
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        setPinned((cur) => (cur === t.id ? null : t.id))
                      }
                    }}
                  >
                    {highlighted && (
                      <motion.circle
                        r={p.r + 8}
                        fill="none"
                        stroke="var(--teal)"
                        strokeWidth={2}
                        initial={{ opacity: 0.9, scale: 0.95 }}
                        animate={{ opacity: [0.9, 0.2, 0.9], scale: [0.95, 1.06, 0.95] }}
                        transition={{ duration: 1.6, repeat: 3 }}
                      />
                    )}
                    <circle className="ring opacity-0 transition-opacity" r={p.r + 5} fill="none" stroke="var(--ring)" strokeWidth={2} />
                    <motion.circle
                      initial={false}
                      animate={{ r: p.r, fill: color }}
                      transition={{ duration: 0.35 }}
                      fillOpacity={0.42}
                      stroke="var(--card)"
                      strokeWidth={2}
                      filter={isActive ? 'url(#tm-shadow-lift)' : 'url(#tm-shadow)'}
                    />
                    <motion.circle
                      initial={false}
                      animate={{ r: p.r * Math.sqrt(t.exposure), fill: color }}
                      transition={{ duration: 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                    <circle r={p.r} fill="url(#tm-hl)" pointerEvents="none" />
                    {inside ? (
                      <g pointerEvents="none" className="font-sans">
                        {lines.map((l, i) => (
                          <text key={i} y={(i - (lines.length - 1) / 2) * 15 - 6} textAnchor="middle" fontSize={13} fontWeight={500} className="fill-exp-ink">
                            {l}
                          </text>
                        ))}
                        <text y={(lines.length / 2) * 15 + 6} textAnchor="middle" fontSize={11.5} className="fill-exp-ink font-mono" opacity={0.75}>
                          {Math.round(t.exposure * 100)}%
                        </text>
                      </g>
                    ) : (
                      <g pointerEvents="none">
                        <text y={4} textAnchor="middle" fontSize={11} className="fill-exp-ink font-mono">
                          {Math.round(t.exposure * 100)}%
                        </text>
                        {lines.map((l, i) => (
                          <text key={i} y={p.r + 15 + i * 13} textAnchor="middle" fontSize={11.5} className="fill-foreground font-sans">
                            {l}
                          </text>
                        ))}
                      </g>
                    )}
                  </g>
                </motion.g>
              )
            })}
          </svg>
        )}

        <AnimatePresence>
          {wide && active && (
            <motion.div
              key={active.id + (cardOnLeft ? 'l' : 'r')}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.18 }}
              className="absolute z-10"
              style={{ left: cardX, top: cardY, width: cardW }}
              onMouseEnter={() => setHovered(active.id)}
              onMouseLeave={() => setHovered(null)}
            >
              <TaskDetailCard task={active} pinned={pinned === active.id} onClose={() => setPinned(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
        Size = time share · Filled core = exposure · Click a bubble to pin details
      </p>

      {!wide && (
        <AnimatePresence mode="wait">
          {active ? (
            <motion.div key={active.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <TaskDetailCard task={active} pinned={pinned === active.id} onClose={() => setPinned(null)} />
            </motion.div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">Tap a bubble to see what it means.</p>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}

export function TaskDetailCard({ task, pinned, onClose }: { task: ScoredTask; pinned: boolean; onClose: () => void }) {
  const explanation = {
    Automate: `High exposure and low reliance on judgment. Tools can already handle much of ${task.name.toLowerCase()} — your role shifts to checking outputs.`,
    Augment: `AI can speed up parts of ${task.name.toLowerCase()}, while your judgment shapes the result.`,
    Protect: `${task.name} leans heavily on human judgment and relationships. This is durable work worth leaning into.`,
  }[task.classification]

  return (
    <div className={cn('rounded-[20px] border border-border bg-card p-5 shadow-lift', pinned && 'border-teal/40')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-xl leading-tight">{task.name}</h3>
        {pinned && (
          <button type="button" onClick={onClose} aria-label="Close details" className="-mr-2 -mt-1 grid size-9 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ExposureBadge value={task.exposure} />
        <ClassificationBadge value={task.classification} />
      </div>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{explanation}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.skills.map((s) => (
          <SkillChip key={s} skillId={s} />
        ))}
      </div>
      {task.classification === 'Augment' && (
        <div className="mt-4 rounded-xl bg-mint p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-accent-foreground">Try this week</p>
          <p className="mt-1 text-sm leading-relaxed text-foreground">{task.tryThisWeek}</p>
          <div className="mt-2 flex justify-end">
            <CopyButton text={task.tryThisWeek} label="Copy" toastMessage="Suggestion copied" />
          </div>
        </div>
      )}
      <p className="mt-3 font-mono text-[10px] text-faint">
        base {Math.round(task.baseExposure * 100)}% · signals {task.adjustment >= 0 ? '+' : ''}
        {(task.adjustment * 100).toFixed(1)} pts · judgment {Math.round(task.humanJudgment * 100)}%
      </p>
    </div>
  )
}
