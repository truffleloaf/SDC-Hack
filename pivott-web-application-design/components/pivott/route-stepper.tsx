'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export const flowSteps = [
  { href: '/start', label: 'Job' },
  { href: '/skills', label: 'Skills' },
  { href: '/map', label: 'Task map' },
  { href: '/routes', label: 'Routes' },
  { href: '/pathway', label: 'Pathway' },
  { href: '/passport', label: 'Passport' },
]

export function RouteStepper() {
  const pathname = usePathname()
  const current = flowSteps.findIndex((s) => pathname.startsWith(s.href))
  if (current < 0) return null
  return (
    <nav aria-label="Progress" className="mx-auto w-full max-w-[1200px] px-5 pt-6">
      <ol className="relative flex items-center justify-between">
        <span aria-hidden className="absolute inset-x-3 top-3 border-t-2 border-dotted border-border-strong" />
        <motion.span
          aria-hidden
          className="absolute left-3 top-3 border-t-2 border-dotted border-teal"
          initial={false}
          animate={{ width: `calc(${(current / (flowSteps.length - 1)) * 100}% - ${(current / (flowSteps.length - 1)) * 24}px)` }}
          transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
        />
        {flowSteps.map((s, i) => {
          const done = i < current
          const active = i === current
          return (
            <li key={s.href} className="relative z-10 flex flex-col items-center gap-2">
              <Link
                href={s.href}
                aria-current={active ? 'step' : undefined}
                className="group flex flex-col items-center gap-2 rounded-lg"
              >
                <span
                  className={cn(
                    'grid size-6 place-items-center rounded-full border-2 bg-background transition-colors',
                    active && 'border-teal',
                    done && 'border-teal bg-teal',
                    !active && !done && 'border-border-strong group-hover:border-teal/60',
                  )}
                >
                  {active && <span className="size-2 rounded-full bg-teal" />}
                </span>
                <span
                  className={cn(
                    'hidden font-sans text-xs font-medium sm:block',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.label}
                </span>
                <span className="sr-only sm:hidden">{s.label}</span>
              </Link>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function PageIntro({
  eyebrow,
  title,
  children,
  className,
}: {
  eyebrow?: string
  title: string
  children?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {eyebrow && <p className="font-sans text-sm font-medium text-primary">{eyebrow}</p>}
      <h1 className="font-serif text-4xl leading-[1.05] tracking-[-0.02em] text-balance md:text-5xl">{title}</h1>
      {children && <div className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">{children}</div>}
    </div>
  )
}
