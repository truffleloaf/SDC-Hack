'use client'

import { motion, useReducedMotion } from 'motion/react'
import { useRef, useState } from 'react'
import { setAdjacentShare } from '@/lib/shares'
import { getState, setState, taskLookup, type AppState } from '@/lib/store'
const tints = [1, 0.78, 0.6, 0.45, 0.33, 0.24, 0.17, 0.12]
export function ShareBar({ state }: { state: AppState }) {
  const reduce = useReducedMotion(), lookup = taskLookup(state)
  const items = state.selections.filter((item) => lookup[item.taskId])
  const bar = useRef<HTMLDivElement>(null)
  const drag = useRef<{ left: string; right: string; x: number; share: number; width: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const name = (id: string) => state.taskNames[id] || lookup[id].name
  let cursor = 0
  return <div ref={bar} role="group" aria-label="Adjust time distribution" className="relative h-11 w-full">
    <div className="absolute inset-x-0 top-3 flex h-5 overflow-hidden rounded-md bg-subtle" aria-hidden>{items.map((item, index) => <motion.span key={item.taskId} initial={false} animate={{ width: `${item.share}%` }} transition={{ duration: reduce || dragging ? 0 : 0.2 }} className="h-full border-r-2 border-card last:border-0" style={{ backgroundColor: `color-mix(in srgb, var(--teal) ${tints[index % tints.length] * 100}%, var(--mint))` }} />)}</div>
    {items.slice(0, -1).map((left, index) => {
      cursor += left.share
      const right = items[index + 1], total = left.share + right.share, minimum = Math.min(1, total / 2)
      return <button key={`${left.taskId}:${right.taskId}`} type="button" role="separator" aria-orientation="vertical" aria-label={`Time boundary between ${name(left.taskId)} and ${name(right.taskId)}`} aria-valuemin={minimum} aria-valuemax={total - minimum} aria-valuenow={Number(left.share.toFixed(2))} aria-valuetext={`${Math.round(left.share)}% ${name(left.taskId)}; ${Math.round(right.share)}% ${name(right.taskId)}`} className="absolute top-0 grid size-11 -translate-x-1/2 touch-none cursor-ew-resize place-items-center rounded-md" style={{ left: `${cursor}%` }}
        onPointerDown={(event) => { drag.current = { left: left.taskId, right: right.taskId, x: event.clientX, share: left.share, width: bar.current?.getBoundingClientRect().width || 1 }; setDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }}
        onPointerMove={(event) => { const current = drag.current; if (current) setState({ selections: setAdjacentShare(getState().selections, current.left, current.right, current.share + (event.clientX - current.x) / current.width * 100) }) }}
        onPointerUp={() => { drag.current = null; setDragging(false) }} onPointerCancel={() => { drag.current = null; setDragging(false) }} onLostPointerCapture={() => { drag.current = null; setDragging(false) }}
        onKeyDown={(event) => { if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return; event.preventDefault(); const selections = getState().selections, current = selections.find((item) => item.taskId === left.taskId)?.share ?? left.share; setState({ selections: setAdjacentShare(selections, left.taskId, right.taskId, current + (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 5 : 1)) }) }}><span className="h-7 w-1 rounded-md border border-card bg-foreground/70" aria-hidden /></button>
    })}
  </div>
}
