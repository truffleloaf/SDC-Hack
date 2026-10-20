'use client'

import { usePathname, useRouter } from 'next/navigation'
import { FlaskConical, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { exitDemo, useAppState } from '@/lib/store'
import { pButton } from './p-button'

export function DemoBanner() {
  const { state, hydrated } = useAppState()
  const pathname = usePathname()
  const router = useRouter()
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
            <span className="font-medium text-foreground">Demo profile</span> · illustrative data. Your own profile is kept separately.
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
