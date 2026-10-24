'use client'

import { motion, useReducedMotion } from 'motion/react'
import { cn } from '@/lib/utils'

const ROUTE = 'M22 54 V12 H36 a13 13 0 0 1 0 26 H22'

function sampleIntroPath(steps = 28) {
  const seg1 = 42
  const seg2 = 14
  const arc = (Math.PI / 2) * 13
  const total = seg1 + seg2 + arc
  const xs: number[] = []
  const ys: number[] = []
  for (let i = 0; i <= steps; i++) {
    const d = (i / steps) * total
    if (d <= seg1) {
      xs.push(22)
      ys.push(54 - d)
    } else if (d <= seg1 + seg2) {
      xs.push(22 + (d - seg1))
      ys.push(12)
    } else {
      const theta = (d - seg1 - seg2) / 13
      xs.push(36 + 13 * Math.sin(theta))
      ys.push(25 - 13 * Math.cos(theta))
    }
  }
  return { xs, ys }
}

const intro = sampleIntroPath()

export function LogoMark({
  className,
  animated = false,
  title = 'Pivott',
}: {
  className?: string
  animated?: boolean
  title?: string
}) {
  const reduce = useReducedMotion()
  const play = animated && !reduce

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-7', className)}
      role={title ? 'img' : undefined}
      aria-label={title || undefined}
      aria-hidden={title ? undefined : true}
    >
      <motion.path
        d={ROUTE}
        initial={play ? { pathLength: 0 } : false}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
      />
      <motion.circle
        cx={22}
        cy={54}
        r={3.5}
        fill="currentColor"
        stroke="none"
        initial={play ? { scale: 0 } : false}
        animate={{ scale: 1 }}
        transition={{ duration: 0.25 }}
        style={{ transformOrigin: '22px 54px' }}
      />
      <motion.circle
        r={3.5}
        fill="var(--primary)"
        stroke="none"
        initial={play ? { cx: 22, cy: 54, opacity: 0 } : false}
        animate={play ? { cx: intro.xs, cy: intro.ys, opacity: [0, 1, 1] } : { cx: 49, cy: 25, opacity: 1 }}
        transition={{ duration: 0.85, delay: 0.85, ease: [0.4, 0, 0.2, 1] }}
        cx={49}
        cy={25}
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return <span className={cn('font-sans font-semibold text-[1.375rem] leading-none tracking-[-0.02em]', className)}>Pivott</span>
}

export function Logo({ animated, className }: { animated?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-foreground', className)}>
      <LogoMark animated={animated} title="" className="size-8" />
      <Wordmark />
    </span>
  )
}
