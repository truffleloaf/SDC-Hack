'use client'

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { SignInProvider } from './sign-in-dialog'
import type { User } from '@supabase/supabase-js'
import { accountProfile, readAccountRow } from '@/lib/account-data'
import { getSupabase, accountSavingConfigured } from '@/lib/supabase'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { replaceState, useAppState, type AppState } from '@/lib/store'
import { roleById } from '@/lib/data/seed'

type Saved = { profile: AppState; revision: number; updated_at: string }
interface AccountContext {
  user: User | null; configured: boolean; status: string; saved: Saved | null; needsChoice: boolean;
  save: () => Promise<void>; load: () => void; refresh: () => Promise<void>; signOut: () => Promise<void>; deleteAccount: () => Promise<void>;
}
const Context = createContext<AccountContext | null>(null)
export function useAccount() { const value = useContext(Context); if (!value) throw new Error('AccountProvider is missing'); return value }

export function AccountProvider({ children }: { children: ReactNode }) {
  const { state, saveStatus } = useAppState()
  const [user, setUser] = useState<User | null>(null)
  const [saved, setSaved] = useState<Saved | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [originChosen, setOriginChosen] = useState(false)
  const activeUser = useRef<string | null>(null)
  activeUser.current = user?.id ?? null
  const [needsChoice, setNeedsChoice] = useState(false)
  const [status, setStatus] = useState('Saved on this device')
  const client = getSupabase()
  useEffect(() => {
    if (!client) return
    let active = true
    void client.auth.getSession().then(({ data, error }) => { if (active) { setUser(data.session?.user ?? null); if (error) setStatus('Couldn’t check sign-in. Try signing in again.') } })
    const { data: { subscription } } = client.auth.onAuthStateChange((_event, session) => { if (active) setUser(session?.user ?? null) })
    return () => { active = false; subscription.unsubscribe() }
  }, [client])

  async function refresh() {
    if (!client || !user) return
    const requestingUser = user.id
    setLoaded(false)
    setStatus('Checking saved profile…')
    const { data, error } = await client.from('user_profiles').select('profile, revision, updated_at').eq('user_id', user.id).maybeSingle()
    if (activeUser.current !== requestingUser) return
    if (error) { setStatus('Couldn’t load account work. Your device profile is unchanged. Retry.'); return }
    try {
      setSaved(data ? readAccountRow(data) : null)
      setLoaded(true); setOriginChosen(!data)
      setNeedsChoice(!!data)
      setStatus(data ? 'Choose which profile to use. Neither has been replaced.' : 'No account profile yet. Save this device’s work when ready.')
    } catch { setStatus('Saved account data could not be read. Your device profile is unchanged.') }
  }
  useEffect(() => { setSaved(null); setNeedsChoice(false); setLoaded(false); setOriginChosen(false); if (user) void refresh(); else setStatus('Saved on this device') }, [user?.id]) // Refresh only when the signed-in user changes.

  async function save() {
    if (!client || !user) return
    if (!loaded) { setStatus('Load your account profile before saving. Use Retry.'); return }
    if (!originChosen) { setNeedsChoice(true); setStatus('Choose the device or account profile first.'); return }
    let profile: AppState
    try { profile = accountProfile(state) } catch { setStatus('Exit the example before saving your own work.'); return }
    const savingUser = user.id
    setStatus('Saving to your account…')
    const query = saved
      ? client.from('user_profiles').update({ profile }).eq('user_id', user.id).eq('revision', saved.revision)
      : client.from('user_profiles').insert({ user_id: user.id, profile })
    const { data, error } = await query.select('profile, revision, updated_at').maybeSingle()
    if (activeUser.current !== savingUser) return
    if (error?.code === '23505' || (!error && !data)) { await refresh(); setStatus('Account work changed on another device. Choose which version to keep.'); return }
    if (error) { setStatus('Couldn’t save to your account. Device work is unchanged. Retry.'); return }
    if (!data) { await refresh(); return }
    try { setSaved(readAccountRow(data)); setStatus('Saved to your account') } catch { setStatus('The saved response could not be read. Reload the account before trying again.') }
  }
  function load() { if (!saved) return; replaceState(saved.profile); setNeedsChoice(false); setOriginChosen(true); setStatus('Using your saved account profile. Also saved on this device.') }
  async function signOut() { if (client) { const { error } = await client.auth.signOut(); setStatus(error ? 'Couldn’t sign out. Retry.' : 'Signed out. Work remains on this device.') } }
  async function deleteAccount() {
    if (!client || !user || !window.confirm('Permanently delete your account and its saved profile? Work on this device will remain.')) return
    const { error } = await client.rpc('delete_own_account')
    if (error) { setStatus('Couldn’t delete the account. Nothing on this device was removed. Retry.'); return }
    await client.auth.signOut({ scope: 'local' }); setUser(null); setSaved(null); setStatus('Account deleted. Work remains on this device.')
  }
  let visibleStatus = !user && saveStatus === 'error' ? 'Couldn’t save on this device · Retry from your plan' : status
  if (user && saved && status === 'Saved to your account' && JSON.stringify({ ...state, recentlyChanged: [] }) !== JSON.stringify(saved.profile)) visibleStatus = 'Changes on this device · Save to account when ready'
  const exposed = { user, configured: accountSavingConfigured, saved, needsChoice, status: visibleStatus, refresh, save, load, signOut, deleteAccount }
  return <Context.Provider value={exposed}><SignInProvider>{children}</SignInProvider>
    <Dialog open={!!user && needsChoice && !!saved} onOpenChange={(open) => setNeedsChoice(open)}>
      <DialogContent><DialogHeader><DialogTitle>Choose which work to keep</DialogTitle><DialogDescription>Neither profile has been replaced. Choosing account work replaces this device’s ratings; choosing device work replaces the account copy only after you press Save to account. Ratings are never merged automatically.</DialogDescription></DialogHeader>
        {saved && <>
          <p className="text-sm">This device: {state.jobTitle || roleById[state.roleId ?? '']?.title || 'No role selected'} · {state.updatedAt ? new Date(state.updatedAt).toLocaleString() : 'Update time unavailable'}</p>
          <p className="text-sm">Your account: {saved.profile.jobTitle || roleById[saved.profile.roleId ?? '']?.title || 'No role selected'} · {new Date(saved.updated_at).toLocaleString()}</p>
          <button className="pivott-input text-left" onClick={() => { setNeedsChoice(false); setOriginChosen(true); setStatus('Device profile selected. Press Save to account to replace the account copy.') }}>Keep this device’s profile</button>
          <button className="pivott-input text-left" onClick={() => { if (window.confirm('Replace this device profile with your saved account profile? Current device ratings will be replaced.')) load() }}>Use my saved profile</button>
          <button className="min-h-11 text-sm text-primary" onClick={() => { setNeedsChoice(false); setStatus('Continuing on this device. Choose a profile before saving to account.') }}>Decide later · Continue on this device</button>
        </>}
      </DialogContent>
    </Dialog>
  </Context.Provider>
}
