'use client'

import { forceCollide, forceSimulation, forceX, forceY, type SimulationNodeDatum } from 'd3-force'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ClassificationBadge, ExposureBadge, SkillChip } from '@/components/pivott/badges'
import { CopyButton } from '@/components/pivott/copy-button'
import { exposureColor, type ScoredTask } from '@/lib/engine'
import { taskById } from '@/lib/data/seed'
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
  changes = [],
}: {
  tasks: ScoredTask[]
  highlightIds?: string[]
  changes?: { taskId: string; before: number; after: number }[]
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
    // Layout depends only on ids, shares, and canvas size, not on exposure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareKey, W, H])

  const activeId = pinned ?? hovered
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
            className="absolute inset-0 touch-manipulation"
            role="group"
            aria-label={`Task map with ${tasks.length} tasks. Bubble size shows time share; the filled core shows exposure.`}
          >


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
              const change = changes.find((item) => item.taskId === t.id)
              const delta = change ? Math.round((change.after - change.before) * 1000) / 10 : 0
              return (
                <motion.g
                  key={t.id}
                  initial={reduce ? false : { x: W / 2, y: H / 2, opacity: 0 }}
                  animate={{ x: p.x, y: p.y, opacity: dim ? 0.6 : 1 }}
                  transition={{ duration: reduce ? 0 : 0.25 }}
                >
                  <g
                    tabIndex={0}
                    role="button"
                    aria-pressed={pinned === t.id}
                    aria-label={`${t.name}: ${Math.round(t.exposure * 100)}% exposure, ${t.classification}, ${Math.round(t.share * 100)}% of your time${change ? `, ${delta >= 0 ? 'up' : 'down'} ${Math.abs(delta)} points after signal application` : ''}`}
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
                    {highlighted && !change && (
                      <motion.circle
                        r={p.r + 8}
                        fill="none"
                        stroke="var(--teal)"
                        strokeWidth={2}
                        initial={{ opacity: 0.9, scale: 0.95 }}
                        animate={{ opacity: 0.6, scale: 1 }}
                        transition={{ duration: reduce ? 0 : 0.2 }}
                      />
                    )}
                    <circle className="ring opacity-0 transition-opacity" r={p.r + 5} fill="none" stroke="var(--ring)" strokeWidth={2} />
                    <motion.circle
                      initial={false}
                      animate={{ r: p.r, fill: color }}
                      transition={{ duration: reduce ? 0 : 0.35 }}
                      fillOpacity={0.42}
                      stroke="var(--card)"
                      strokeWidth={2}
                    />
                    <motion.circle
                      initial={false}
                      animate={{ r: p.r * Math.sqrt(t.exposure), fill: color }}
                      transition={{ duration: reduce ? 0 : 0.45, ease: [0.2, 0.7, 0.2, 1] }}
                    />
                    {change && <circle data-before-exposure={change.before} r={p.r * Math.sqrt(Math.max(0, change.before))} fill="none" stroke="var(--foreground)" strokeOpacity={0.65} strokeDasharray="3 4" strokeWidth={2} pointerEvents="none" />}
                    {change && <g aria-hidden pointerEvents="none" transform={`translate(${p.r * 0.35} ${-p.r * 0.7})`}><rect x={-29} y={-10} width={58} height={18} rx={4} fill="var(--card)" stroke="var(--border-strong)" /><text textAnchor="middle" y={3} fontSize={11} className="fill-foreground font-mono">{delta >= 0 ? '+' : ''}{delta} pts</text></g>}
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

      <p className="font-sans text-xs font-medium text-faint">
        Size = time share · Filled core = exposure · Click a bubble to pin details
      </p>

      {!wide && <Sheet open={!!pinned} onOpenChange={(open) => !open && setPinned(null)}><SheetContent side="bottom" className="max-h-[80dvh] overflow-y-auto rounded-t-xl"><SheetHeader><SheetTitle>Task details</SheetTitle></SheetHeader>{active && <TaskDetailCard task={active} pinned onClose={() => setPinned(null)} />}</SheetContent></Sheet>}

    </div>
  )
}

export function TaskDetailCard({ task, pinned, onClose, surface = 'panel' }: { task: ScoredTask; pinned: boolean; onClose: () => void; surface?: 'panel' | 'solid' }) {
  const explanation = {
    Automate: `High exposure and low reliance on judgment. Tools may assist with routine parts of ${task.name.toLowerCase()}. Outputs still need checking.`,
    Augment: `AI can speed up parts of ${task.name.toLowerCase()}, while your judgment shapes the result.`,
    Protect: `${task.name} leans heavily on human judgment and relationships.`,
  }[task.classification]

  return (
    <div className={cn('rounded-xl p-5', surface === 'panel' ? 'surface-panel' : 'bg-card', pinned && 'border-teal/40')}>
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-serif text-xl leading-tight">{task.name}</h3>
        {pinned && (
          <button type="button" onClick={onClose} aria-label="Close details" className="-mr-2 -mt-1 grid size-9 place-items-center rounded-lg text-faint hover:bg-subtle hover:text-foreground">
            <X className="size-4" aria-hidden />
          </button>
        )}
      </div>
      {taskById[task.id] && taskById[task.id].name !== task.name && <p className="mt-2 text-xs text-muted-foreground">Based on template: {taskById[task.id].name}</p>}
      <p className="mt-2 text-sm text-muted-foreground">{Math.round(task.share * 100)}% of assessed working time</p>
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
      <p className="mt-3 text-sm text-muted-foreground">Human judgment: {task.humanJudgment >= 0.65 ? "context, relationships and exceptions remain important." : "check accuracy, handle exceptions and decide when to intervene."}</p>
      {(
        <div className="mt-4 rounded-xl bg-mint p-3">
          <p className="font-sans text-xs font-medium text-accent-foreground">Try this week</p>
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
