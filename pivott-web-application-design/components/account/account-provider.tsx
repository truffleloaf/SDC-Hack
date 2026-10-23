'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { toast } from 'sonner'
import { SignInProvider } from './sign-in-dialog'
import { accountProfile, readAccountRow } from '@/lib/account-data'
import { BACKUP_KEY, createBackup, hasWork, profileContent, readBackup, syncDecision, type ProfileBackup, type SavedProfile } from '@/lib/account-sync'
import { getSupabase, accountSavingConfigured } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PButton } from '@/components/pivott/p-button'
import { getState, replaceState, useAppState, type AppState } from '@/lib/store'
import { roleById } from '@/lib/data/seed'

interface AccountContext {
  user: User | null; configured: boolean; status: string; saved: SavedProfile | null; needsChoice: boolean; syncEnabled: boolean;
  save: () => Promise<void>; load: () => void; refresh: () => Promise<void>; signOut: (local?: boolean) => Promise<void>; deleteAccount: () => Promise<boolean>;
  setSyncEnabled: (value: boolean) => void; replaceDevice: (profile: AppState) => boolean; undo: () => Promise<void>;
}
const Context = createContext<AccountContext | null>(null)
export function useAccount() { const value = useContext(Context); if (!value) throw new Error('AccountProvider is missing'); return value }

export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, saveStatus } = useAppState()
  const [user, setUser] = useState<User | null>(null)
  const [saved, setSaved] = useState<SavedProfile | null>(null)
  const savedRef = useRef<SavedProfile | null>(null)
  const [ready, setReady] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [needsChoice, setNeedsChoice] = useState(false)
  const [compareOpen, setCompareOpen] = useState(false)
  const [syncEnabled, setSync] = useState(true)
  const syncRef = useRef(syncEnabled); syncRef.current = syncEnabled
  const readyRef = useRef(ready); readyRef.current = ready
  const [status, setStatus] = useState('Saved on this device')
  const [saving, setSaving] = useState(false)
  const inFlight = useRef(false)
  const activeUser = useRef<string | null>(null); activeUser.current = user?.id ?? null
  const generation = useRef(0)
  const authGeneration = useRef(0)
  const retry = useRef<ReturnType<typeof setTimeout> | null>(null)
  const expiry = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef<() => Promise<void>>(async () => {})
  const undoRef = useRef<() => Promise<void>>(async () => {})
  const client = getSupabase()
  function recordSaved(row: SavedProfile | null) { savedRef.current = row; setSaved(row) }
  function stopRetry() { if (retry.current) clearTimeout(retry.current); retry.current = null }
  function setSyncEnabled(value: boolean) {
    setSync(value); syncRef.current = value
    try { if (activeUser.current) localStorage.setItem(`pivott:sync:${activeUser.current}`, String(value)) } catch { /* Device saving status is shown separately. */ }
    if (!value) { stopRetry(); setStatus('Sync paused') }
    else if (user) void refresh()
  }
  function backup(input: { side: 'device' | 'account'; profile: AppState | null; revision?: number }) {
    const value = createBackup(localStorage, { ...input, owner: activeUser.current })
    if (expiry.current) clearTimeout(expiry.current)
    expiry.current = setTimeout(() => { try { if (JSON.parse(localStorage.getItem(BACKUP_KEY) || 'null')?.id === value.id) localStorage.removeItem(BACKUP_KEY) } catch {} }, 30000)
    return value
  }
  function announce(message: string, value?: ProfileBackup) {
    toast.success(message, value ? { duration: 30000, action: { label: 'Undo', onClick: () => { if (readBackup(localStorage, activeUser.current)?.id === value.id) void undoRef.current(); else toast('This backup has expired or been replaced.') } } } : undefined)
  }
  function replaceDevice(profile: AppState) {
    try { const previous = backup({ side: 'device', profile: getState() }); replaceState(profile); announce('Loaded your saved plan.', previous); return true }
    catch { setStatus('Couldn’t create a device backup. Free some browser storage and retry.'); return false }
  }
  function showCompare() { setReady(false); readyRef.current = false; setNeedsChoice(true); setCompareOpen(true); setStatus('Choose a version to sync') }
  function reconcile(row: SavedProfile | null) {
    const decision = syncDecision(getState(), row)
    if (!syncRef.current) { setReady(decision !== 'compare'); readyRef.current = decision !== 'compare'; setNeedsChoice(decision === 'compare'); setCompareOpen(false); setStatus('Sync paused'); return }
    if (decision === 'compare') { showCompare(); return }
    if (decision === 'wait') { setReady(false); setStatus('Example profile. Sync resumes with your own work.'); return }
    if (decision === 'load' && row && !replaceDevice(row.profile)) return
    setNeedsChoice(false); setCompareOpen(false); setReady(true); readyRef.current = true
    setStatus(syncRef.current ? decision === 'upload' ? 'Changes waiting to sync' : 'Saved' : 'Sync paused')
    if (decision === 'upload' && syncRef.current) void saveRef.current()
  }
  async function refresh() {
    if (!client || !activeUser.current) return
    const owner = activeUser.current, request = ++generation.current
    setReady(false); readyRef.current = false; setLoaded(false); setStatus('Checking saved plan…')
    try {
      const { data, error } = await client.from('user_profiles').select('profile, revision, updated_at').eq('user_id', owner).maybeSingle()
      if (activeUser.current !== owner || generation.current !== request) return
      if (error) { setStatus('Couldn’t load account work. Retry from Account.'); return }
      const row = data ? readAccountRow(data) : null
      recordSaved(row); setLoaded(true); reconcile(row)
    } catch { if (activeUser.current === owner) setStatus('Couldn’t read account work. This device is unchanged. Retry from Account.') }
  }
  async function save() {
    const owner = activeUser.current
    if (!client || !owner || inFlight.current) return
    if (!readyRef.current) { if (needsChoice) setCompareOpen(true); else void refresh(); return }
    let profile: AppState
    try { profile = accountProfile(getState()) } catch { setStatus('Exit the example to sync your own work.'); return }
    if (!hasWork(profile)) return
    if (savedRef.current && profileContent(profile) === profileContent(savedRef.current.profile)) { setStatus(syncRef.current ? 'Saved' : 'Sync paused'); return }
    const previous = savedRef.current
    let recovery: ProfileBackup | undefined
    try { if (previous) recovery = backup({ side: 'account', profile: previous.profile }) }
    catch { setStatus('Couldn’t create a backup. Free some browser storage and retry.'); return }
    inFlight.current = true; setSaving(true); setStatus('Saving…'); stopRetry()
    try {
      const query = previous ? client.from('user_profiles').update({ profile }).eq('user_id', owner).eq('revision', previous.revision) : client.from('user_profiles').insert({ user_id: owner, profile })
      const { data, error } = await query.select('profile, revision, updated_at').maybeSingle()
      if (activeUser.current !== owner) return
      if (error?.code === '23505' || (!error && !data)) { await refresh(); return }
      if (error) {
        const offline = !navigator.onLine || /fetch|network|connection/i.test(error.message)
        setStatus(offline ? 'Offline, will retry' : 'Sync failed. Retry from Account.')
        if (offline && syncRef.current) retry.current = setTimeout(() => void saveRef.current(), 5000)
        return
      }
      const row = readAccountRow(data)
      if (recovery) { recovery.revision = row.revision; localStorage.setItem(BACKUP_KEY, JSON.stringify(recovery)) }
      recordSaved(row); setStatus(syncRef.current ? 'Saved' : 'Sync paused')
      if (!previous || recovery) announce('Plan saved to your account.', recovery)
    } catch { if (activeUser.current === owner) setStatus('Sync failed. Your device work is unchanged. Retry from Account.') }
    finally { inFlight.current = false; setSaving(false) }
  }
  saveRef.current = save
  async function undo() {
    const owner = activeUser.current
    const previous = readBackup(localStorage, owner)
    if (!previous) { toast('The 30-second undo period has ended.'); return }
    setSyncEnabled(false)
    if (previous.side === 'device' && previous.profile) { replaceState(previous.profile); localStorage.removeItem(BACKUP_KEY); toast('Restored the previous device version. Sync is paused.'); return }
    if (!client || !owner || !previous.revision) return
    try {
      const query = previous.profile ? client.from('user_profiles').update({ profile: previous.profile }).eq('user_id', owner).eq('revision', previous.revision) : client.from('user_profiles').delete().eq('user_id', owner).eq('revision', previous.revision)
      const { data, error } = await query.select('profile, revision, updated_at').maybeSingle()
      if (error || !data) { setStatus('Account changed again. Reload it before restoring a backup.'); return }
      recordSaved(previous.profile ? readAccountRow(data) : null); localStorage.removeItem(BACKUP_KEY); toast('Restored the previous account version. Sync is paused.')
    } catch { setStatus('Couldn’t restore the backup. Retry before the undo period ends.') }
  }
  undoRef.current = undo
  function load() {
    if (!savedRef.current || !replaceDevice(savedRef.current.profile)) return
    setNeedsChoice(false); setCompareOpen(false); setReady(true); readyRef.current = true; setStatus(syncRef.current ? 'Saved' : 'Sync paused')
  }
  async function signOut(local = false) {
    authGeneration.current++; stopRetry(); setReady(false); readyRef.current = false
    if (!client) return
    const { error } = await client.auth.signOut(local ? { scope: 'local' } : undefined)
    if (local) {
      client.auth.stopAutoRefresh()
      try { for (const key of Object.keys(localStorage)) if (key.startsWith('sb-')) localStorage.removeItem(key) } catch {}
    }
    if (!error || local) setUser(null)
    setStatus(error && !local ? 'Couldn’t sign out. Retry.' : 'Signed out. Work remains on this device.')
  }

  async function deleteAccount() {
    if (!client || !activeUser.current) return false
    stopRetry(); setReady(false); readyRef.current = false
    const { error } = await client.rpc('delete_own_account')
    if (error) { setStatus('Couldn’t delete the account. Retry.'); return false }
    await signOut(true); recordSaved(null); setStatus('Account deleted. Work remains on this device.'); return true
  }
  useEffect(() => {
    if (!client) return
    let active = true
    const authRequest = authGeneration.current
    void client.auth.getSession().then(({ data, error }) => { if (active && authRequest === authGeneration.current) { setUser(data.session?.user ?? null); if (error) setStatus('Couldn’t check sign-in. Try again.') } })
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { if (active) { setUser(session?.user ?? null); if (session) client.auth.startAutoRefresh() } })
    return () => { active = false; subscription.unsubscribe() }
  }, [client])
  useEffect(() => {
    generation.current++; stopRetry(); recordSaved(null); setLoaded(false); setReady(false); readyRef.current = false; setNeedsChoice(false); setCompareOpen(false)
    if (!user) { setStatus('Saved on this device'); return }
    let enabled = true
    try { enabled = localStorage.getItem(`pivott:sync:${user.id}`) !== 'false' } catch {}
    setSync(enabled); syncRef.current = enabled; void refresh()
  }, [user?.id])
  useEffect(() => {
    if (!user || !ready || !syncEnabled || saving || state.mode === 'demo') return
    if (saved && profileContent(state) === profileContent(saved.profile)) return
    const timer = setTimeout(() => void saveRef.current(), 2000)
    return () => clearTimeout(timer)
  }, [state, saved, user?.id, ready, syncEnabled, saving])
  useEffect(() => { if (user && loaded && !ready && !needsChoice && state.mode === 'personal') reconcile(savedRef.current) }, [state.mode, loaded])
  useEffect(() => {
    const online = () => { if (activeUser.current && syncRef.current) { if (readyRef.current) void saveRef.current(); else void refresh() } }
    window.addEventListener('online', online)
    return () => { window.removeEventListener('online', online); stopRetry(); if (expiry.current) clearTimeout(expiry.current) }
  }, [])
  let visibleStatus = !user && saveStatus === 'error' ? 'Couldn’t save on this device. Retry.' : status
  if (user && ready && syncEnabled && !saving && saved && profileContent(state) !== profileContent(saved.profile) && status === 'Saved') visibleStatus = 'Changes waiting to sync'
  const exposed = { user, configured: accountSavingConfigured, status: visibleStatus, saved, needsChoice, syncEnabled, save, load, refresh, signOut, deleteAccount, setSyncEnabled, replaceDevice, undo }
  const newerDevice = !!saved && Date.parse(state.updatedAt || '') > Date.parse(saved.updated_at)
  function versionCard(label: string, profile: AppState, time: string | null, newer: boolean) { return <div className={`rounded-lg border p-4 ${newer ? 'border-primary' : 'border-border'}`}><h3 className="font-medium">{label}{newer ? ' · Newer timestamp' : ''}</h3><p className="mt-2 text-sm">{profile.jobTitle || roleById[profile.roleId ?? '']?.title || 'No role selected'}</p><p className="mt-1 text-sm text-muted-foreground">{profile.selections.length} tasks · {Object.keys(profile.skills).length} skills rated</p><p className="mt-1 text-xs text-muted-foreground">{time ? new Date(time).toLocaleString() : 'Update time unavailable'}</p></div> }
  return <Context.Provider value={exposed}><SignInProvider>{children}</SignInProvider><Dialog open={!!user && needsChoice && compareOpen && !!saved} onOpenChange={setCompareOpen}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Choose the plan to sync</DialogTitle><DialogDescription>Both versions contain work. Choose one to use on this device and your account. The replaced version can be restored for 30 seconds. Ratings are not merged.</DialogDescription></DialogHeader>{saved && <><div className="grid gap-3 sm:grid-cols-2">{versionCard('This device', state, state.updatedAt, newerDevice)}{versionCard('Your account', saved.profile, saved.updated_at, !newerDevice)}</div><div className="flex flex-wrap gap-3"><PButton onClick={load}>Use account version</PButton><PButton variant="secondary" onClick={() => { setNeedsChoice(false); setCompareOpen(false); setReady(true); readyRef.current = true; void saveRef.current() }}>Use this device’s version</PButton></div><p className="text-xs text-muted-foreground">Close this dialog to keep working without syncing. Reopen it from Account.</p></>}</DialogContent></Dialog></Context.Provider>
}
