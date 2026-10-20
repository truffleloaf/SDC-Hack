import { CloudOff, Compass } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { PButton, PLink } from './p-button'

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded-xl bg-subtle', className)} aria-hidden />
}

export function PageSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-5 py-10" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-12 w-2/3 max-w-xl" />
      <div className="grid gap-4 md:grid-cols-3">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 rounded-[20px] border border-dashed border-border-strong bg-card/60 px-6 py-12 text-center', className)}>
      <span className="grid size-12 place-items-center rounded-full bg-mint text-accent-foreground">
        {icon ?? <Compass className="size-5" aria-hidden />}
      </span>
      <h2 className="font-serif text-2xl text-balance">{title}</h2>
      {description && <p className="max-w-sm text-sm leading-relaxed text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="mt-2 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  )
}

export function ErrorState({ title = 'Something went off route', onRetry }: { title?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      icon={<CloudOff className="size-5" aria-hidden />}
      title={title}
      description="Nothing is lost. Your profile is still saved in this browser."
      action={onRetry && <PButton variant="secondary" onClick={onRetry}>Try again</PButton>}
    />
  )
}

export function NeedsProfile({ step = 'job' }: { step?: 'job' | 'skills' | 'route' }) {
  const map = {
    job: { title: 'Start with your work', description: 'Pick your job and tasks first — it takes about a minute.', href: '/start', cta: 'Map my job' },
    skills: { title: 'Rate a few skills first', description: 'Your routes depend on the skills you already bring.', href: '/skills', cta: 'Rate my skills' },
    route: { title: 'Choose a route first', description: 'Pick a destination role to build a learning plan.', href: '/routes', cta: 'See my routes' },
  }[step]
  return (
    <div className="mx-auto w-full max-w-xl px-5 py-20">
      <EmptyState
        title={map.title}
        description={map.description}
        action={
          <>
            <PLink href={map.href}>{map.cta}</PLink>
            <PLink href="/example" variant="secondary">Use Aisyah’s example</PLink>
          </>
        }
      />
    </div>
  )
}
