'use client'

import { animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export function ProgressRing({
  value,
  size = 64,
  stroke = 5,
  children,
  className,
  label,
}: {
  value: number
  size?: number
  stroke?: number
  children?: ReactNode
  className?: string
  label: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      className={cn('relative inline-grid place-items-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(v * 100)}%`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--border)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--teal)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          initial={false}
          animate={{ strokeDashoffset: c * (1 - v) }}
          transition={{ duration: 0.5, ease: [0.2, 0.7, 0.2, 1] }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  )
}

export function CountUp({
  value,
  format = (n) => Math.round(n).toString(),
  className,
  duration = 0.8,
}: {
  value: number
  format?: (n: number) => string
  className?: string
  duration?: number
}) {
  const reduce = useReducedMotion()
  const [display, setDisplay] = useState(value)
  const from = useRef(value)

  useEffect(() => {
    if (reduce) {
      setDisplay(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration,
      ease: [0.2, 0.7, 0.2, 1],
      onUpdate: (v) => { from.current = v; setDisplay(v) },
    })
    return () => controls.stop()
  }, [value, reduce, duration])

  return (
    <span className={cn('tabular-nums', className)} aria-label={format(value)}>
      <span aria-hidden>{format(display)}</span>
    </span>
  )
}
