'use client'

import { usePathname, useRouter } from 'next/navigation'
import { Database, FlaskConical, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { exitDemo, useAppState } from '@/lib/store'
import { hasDemoPersona, SEED_VERSION } from '@/lib/data/seed'
import { pButton } from './p-button'

export function DemoBanner() {
  const { state, hydrated } = useAppState()
  const pathname = usePathname()
  const router = useRouter()

  // Live catalogue: no demo persona exists, so advertise the real source instead.
  if (!hasDemoPersona) {
    if (pathname === '/' || pathname === '/example') return null
    return (
      <div className="px-3 pt-2 sm:px-5">
        <div
          role="status"
          className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-subtle px-4 py-2 text-xs"
        >
          <p className="flex items-center gap-2 text-muted-foreground">
            <Database aria-hidden className="size-3.5 shrink-0 text-primary" />
            <span>
              <span className="font-medium text-foreground">Live catalogue</span> · O*NET 31.0 + live demand ·{' '}
              <span className="font-mono">{SEED_VERSION}</span>
            </span>
          </p>
          <a
            href="/api/live/status"
            target="_blank"
            rel="noreferrer"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Source details
          </a>
        </div>
      </div>
    )
  }

  if (!hydrated || state.mode !== 'demo' || pathname === '/' || pathname === '/example') return null

  function leave() {
    exitDemo()
    toast.success('Back to your own profile')
    router.push('/start')
  }

  return (
    <div className="px-3 pt-2 sm:px-5">
      <div
        role="status"
        className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-4 gap-y-2 rounded-xl border border-border bg-subtle px-4 py-2.5 text-sm"
      >
        <p className="flex items-center gap-2 text-muted-foreground">
          <FlaskConical aria-hidden className="size-4 shrink-0 text-primary" />
          <span>
            <span className="font-medium text-foreground">Example profile</span>. Your own profile is kept separately.
          </span>
        </p>
        <button type="button" onClick={leave} className={pButton({ variant: 'ghost', size: 'sm' })}>
          <LogOut aria-hidden />
          Exit demo
        </button>
      </div>
    </div>
  )
}
