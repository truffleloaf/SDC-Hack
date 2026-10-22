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
  const groups = [
    { href: '/map', label: 'Work', paths: ['/start', '/map'] },
    { href: '/routes', label: 'Routes', paths: ['/skills', '/routes'] },
    { href: '/pathway', label: 'Plan', paths: ['/pathway', '/passport', '/workspace'] },
  ]
  if (!groups.some((group) => group.paths.includes(pathname))) return null
  return <nav aria-label="Workspace" className="mx-auto flex max-w-[1200px] gap-6 border-b border-border px-5 pt-5">{groups.map((group) => <Link key={group.href} href={group.href} aria-current={group.paths.includes(pathname) ? 'page' : undefined} className={cn('border-b-2 border-transparent px-1 pb-3 text-sm', group.paths.includes(pathname) ? 'border-primary font-medium text-primary' : 'text-muted-foreground')}>{group.label}</Link>)}</nav>
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
