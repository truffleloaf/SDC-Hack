'use client'
import { useEffect, useState } from 'react'
import { useAccount } from './account-provider'
import { useSignIn } from './sign-in-dialog'
import { PButton } from '@/components/pivott/p-button'
let offered = false
export function SyncNote({ eligible = true }: { eligible?: boolean }) {
  const account = useAccount(), { openSignIn } = useSignIn()
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    if (!eligible || !account.configured || account.user || offered) return
    try { if (localStorage.getItem('pivott:sync-prompt-dismissed') || sessionStorage.getItem('pivott:sync-prompt-shown')) return; sessionStorage.setItem('pivott:sync-prompt-shown', '1') } catch { /* The in-memory flag still limits prompts. */ }
    offered = true; setVisible(true)
  }, [eligible, account.configured, account.user])
  if (!visible || account.user || !account.configured) return null
  return <aside className="mt-6 flex flex-wrap items-center gap-3 border-y border-border py-3 text-sm"><p>Want this plan on your phone? Sign in to sync it.</p><PButton size="sm" variant="secondary" onClick={() => openSignIn()}>Sign in to sync</PButton><button className="min-h-11 text-sm text-muted-foreground underline" onClick={() => { setVisible(false); try { localStorage.setItem('pivott:sync-prompt-dismissed', '1') } catch {} }}>Dismiss</button></aside>
}
