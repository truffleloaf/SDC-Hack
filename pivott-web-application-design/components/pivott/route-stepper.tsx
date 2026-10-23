'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'motion/react'
import { Check } from 'lucide-react'
import { skills, roleById } from '@/lib/data/seed'
import { buildPathway } from '@/lib/engine'
import { planProgress } from '@/lib/plan-progress'
import { useAppState } from '@/lib/store'
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
  const { state } = useAppState()
  const reduce = useReducedMotion()
  const rated = skills.filter((skill) => state.skills[skill.id] !== undefined).length
  const target = state.targetRoleId ? roleById[state.targetRoleId] : undefined
  const plan = target ? buildPathway({ targetRoleId: target.id, levels: state.skills, hoursPerWeek: state.hoursPerWeek, freeOnly: state.freeOnly }) : { steps: [] }
  const progress = planProgress(target, plan.steps, state.completedSteps, state.skills)
  const summaries = [state.roleId && state.selections.length ? 'Work done' : 'Choose tasks', `Skills rated ${rated}/${skills.length}`, !target ? 'Choose a role' : progress.unknownCount ? 'Partial plan' : `${Math.round(progress.progress * 100)}% done`]
  const complete = [!!state.roleId && state.selections.length > 0, rated === skills.length, progress.complete]
  const groups = [
    { href: '/map', label: 'Work', paths: ['/start', '/map'] },
    { href: '/routes', label: 'Routes', paths: ['/skills', '/routes'] },
    { href: '/pathway', label: 'Plan', paths: ['/pathway', '/passport', '/workspace'] },
  ]
  if (!groups.some((group) => group.paths.includes(pathname))) return null
  return <nav aria-label="Workspace" className="mx-auto flex max-w-[1200px] gap-4 border-b border-border px-5 pt-4">{groups.map((group, index) => {
    const active = group.paths.includes(pathname)
    return <Link key={group.href} href={group.href} aria-current={active ? 'page' : undefined} className={cn('relative flex min-h-14 min-w-0 flex-1 flex-col gap-1 pb-3 sm:flex-initial sm:pr-6', active ? 'font-medium text-primary' : 'text-muted-foreground')}><span className="flex items-center gap-1.5 text-sm">{group.label}{complete[index] && <Check className="size-3.5" aria-hidden />}</span><span className="text-[11px] font-normal text-muted-foreground">{summaries[index]}</span>{active && <motion.span layoutId="workspace-active-step" className="absolute inset-x-0 bottom-0 h-0.5 bg-primary" transition={reduce ? { duration: 0 } : { type:'spring',stiffness:400,damping:35 }} />}</Link>
  })}</nav>
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
      <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-balance md:text-4xl">{title}</h1>
      {children && <div className="max-w-2xl text-base leading-relaxed text-muted-foreground text-pretty">{children}</div>}
    </div>
  )
}
