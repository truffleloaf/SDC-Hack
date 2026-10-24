'use client'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAccount } from './account-provider'
import { useSignIn } from './sign-in-dialog'
import { PButton } from '@/components/pivott/p-button'
import { ConfirmDialog } from '@/components/pivott/confirm-dialog'
import { Switch } from '@/components/ui/switch'
import { accountProfile, readAccountProfile } from '@/lib/account-data'
import { getState, useAppState, type AppState } from '@/lib/store'
import { downloadFile } from '@/lib/ics'
import { roleById } from '@/lib/data/seed'
export function AccountPanel() {
  const account = useAccount(), { openSignIn } = useSignIn()
  const { state } = useAppState()
  const input = useRef<HTMLInputElement>(null)
  const [removeOpen, setRemoveOpen] = useState(false), [imported, setImported] = useState<AppState | null>(null), [error, setError] = useState('')
  async function read(file: File) {
    setError('')
    try {
      if (file.size > 1024 * 1024) throw new Error('Choose a Pivott JSON backup smaller than 1 MB.')
      const data = JSON.parse(await file.text())
      setImported(readAccountProfile(data?.format === 'pivott-profile-v1' ? data.profile : data))
    } catch (failure) { setError(failure instanceof Error && failure.message.startsWith('Choose') ? failure.message : 'This is not a readable Pivott profile backup. Your current work is unchanged.') }
    finally { if (input.current) input.current.value = '' }
  }
  return <section id="account" className="mt-8 border-t border-border pt-6"><h2 className="text-lg font-semibold">Saving and account</h2>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Guest work stays in this browser. Download a backup to move it yourself. Signing in syncs confirmed profile fields, tasks, ratings, signals, saved routes and plan progress. Résumé files and extracted text are never included.</p>
    <p role="status" className="mt-3 text-sm">{account.status}</p>
    {account.user ? <><p className="mt-2 break-words text-sm">{account.user.email}</p><label className="mt-4 flex min-h-11 items-center justify-between gap-4 text-sm">Sync this plan<Switch checked={account.syncEnabled} onCheckedChange={account.setSyncEnabled} /></label><div className="mt-4 flex flex-wrap gap-3"><PButton size="sm" onClick={() => void account.save()} loading={account.status.startsWith('Saving')}>Save to account</PButton><PButton size="sm" variant="secondary" onClick={() => void account.refresh()}>{account.needsChoice ? 'Compare versions' : 'Reload account / Retry'}</PButton><PButton size="sm" variant="ghost" onClick={() => void account.signOut()}>Sign out</PButton></div><PButton className="mt-4" size="sm" variant="ghost" onClick={() => void account.undo()}>Undo last replacement</PButton><button className="mt-5 block min-h-11 text-sm text-destructive" onClick={() => setRemoveOpen(true)}>Delete account</button></> : account.configured ? <PButton className="mt-4" size="sm" variant="secondary" onClick={() => openSignIn('/account')}>Sign in to sync</PButton> : <p className="mt-3 text-sm text-muted-foreground">Account sync is unavailable in this deployment. Device backups are available below.</p>}
    <div className="mt-6 flex flex-wrap gap-3"><PButton variant="secondary" size="sm" disabled={state.mode === 'demo'} onClick={() => {
      const profile = accountProfile(getState())
      downloadFile(JSON.stringify({ format: 'pivott-profile-v1', exportedAt: new Date().toISOString(), profile }), 'pivott-profile.json', 'application/json')
      toast('Downloaded your profile backup.')
    }}>Download my data (JSON)</PButton><PButton variant="secondary" size="sm" disabled={state.mode === 'demo'} onClick={() => input.current?.click()}>Import from file</PButton></div><input ref={input} className="sr-only" tabIndex={-1} aria-label="Pivott JSON backup" type="file" accept=".json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void read(file) }} />
    {state.mode === 'demo' && <p className="mt-3 text-sm text-muted-foreground">Exit the example to download or import your personal work.</p>}{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <ConfirmDialog open={removeOpen} onOpenChange={setRemoveOpen} title="Delete account" description="This permanently removes your sign-in account and its saved profile. Work on this device remains until you delete it separately." requiredText="delete" confirmLabel="Delete account" destructive onConfirm={account.deleteAccount} />
    <ConfirmDialog open={!!imported} onOpenChange={(value) => !value && setImported(null)} title="Import profile backup" description={`Replace this device’s profile with ${imported?.jobTitle || roleById[imported?.roleId ?? '']?.title || 'the imported profile'} (${imported?.selections.length ?? 0} tasks)? The previous device version can be restored for 30 seconds. ${account.user && account.syncEnabled ? 'The imported version will sync to your account.' : 'This changes the device copy only.'}`} confirmLabel="Import profile" onConfirm={() => imported ? account.replaceDevice(imported) : false} />
  </section>
}
