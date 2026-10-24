'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import { useAccount } from '@/components/account/account-provider'
import { ConfirmDialog } from './confirm-dialog'
import { PButton, PLink } from './p-button'
import { emptyState, useAppState } from '@/lib/store'

export function ResumeWork() {
  const { state, hydrated } = useAppState()
  const account = useAccount()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [fresh, setFresh] = useState(false)
  if (!hydrated || !state.roleId || state.mode !== 'personal' || dismissed) return null
  return <>
    <aside aria-label="Continue your plan" className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-3 border-b border-border px-5 py-4 text-sm">
      <p className="mr-auto">Welcome back. Your plan is saved on this device.</p>
      <PLink href="/workspace" size="sm" variant="secondary">Continue your plan</PLink>
      <PButton size="sm" variant="ghost" onClick={() => setFresh(true)}>Start fresh</PButton>
      <button aria-label="Dismiss welcome message" onClick={() => setDismissed(true)} className="grid size-11 place-items-center rounded-md"><X className="size-4" aria-hidden /></button>
    </aside>
    <ConfirmDialog open={fresh} onOpenChange={setFresh} title="Start a new plan on this device" description={`Replace this device’s tasks, ratings and progress with a blank plan. ${account.user ? "Account sync will pause, keeping the account version. " : ""}You can undo for 30 seconds.`} confirmLabel="Start fresh" onConfirm={() => {
      if (account.replaceDevice({ ...emptyState, updatedAt: new Date().toISOString() }, 'Started a new device plan.')) {
        if (account.user) account.setSyncEnabled(false)
        router.push('/start')
      } else toast.error('Couldn’t create a backup. Free some browser storage and retry.')
    }} />
  </>
}
