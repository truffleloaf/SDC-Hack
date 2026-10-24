'use client'
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Bell, BellRing, BriefcaseBusiness, CheckCheck, ExternalLink, MapPin, RefreshCw, SlidersHorizontal, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { PButton, pButton } from '@/components/pivott/p-button'
import { roles } from '@/lib/data/seed'
import { cn } from '@/lib/utils'
import {
  JOB_NOTIFICATIONS_KEY,
  alertFilterSignature,
  detectJobChanges,
  dueForCheck,
  filterAlertJobs,
  initialJobNotificationState,
  parseJobApiPayload,
  readJobNotificationState,
  sanitizeJobAlertPreferences,
  type CheckInterval,
  type JobAlertPreferences,
  type JobNotificationState,
  type WorkplacePreference,
} from '@/lib/job-notifications'

type Panel = 'updates' | 'settings'
type NotificationContextValue = {
  state: JobNotificationState
  checking: boolean
  error: string
  openCenter: (panel?: Panel) => void
  checkNow: () => Promise<void>
  configure: (preferences: JobAlertPreferences) => void
  markAllRead: () => void
  markRead: (id: string) => void
  clearNotices: () => void
}
const Context = createContext<NotificationContextValue | null>(null)

export function useJobNotifications() {
  const value = useContext(Context)
  if (!value) throw new Error('useJobNotifications must be used inside JobNotificationProvider')
  return value
}

export function JobNotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(initialJobNotificationState)
  const stateRef = useRef(state)
  const [hydrated, setHydrated] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState('')
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<Panel>('updates')
  const inFlight = useRef(false)
  const autoStarted = useRef(false)
  const commit = useCallback((change: (current: JobNotificationState) => JobNotificationState) => {
    setState(current => { const next = change(current); stateRef.current = next; return next })
  }, [])

  useEffect(() => {
    let loaded = initialJobNotificationState
    try { loaded = readJobNotificationState(localStorage.getItem(JOB_NOTIFICATIONS_KEY)) } catch {}
    stateRef.current = loaded; setState(loaded); setHydrated(true)
  }, [])
  useEffect(() => {
    const clear = () => { stateRef.current = initialJobNotificationState; setState(initialJobNotificationState); setError(''); setOpen(false) }
    window.addEventListener('pivott:clear-device-data', clear)
    return () => window.removeEventListener('pivott:clear-device-data', clear)
  }, [])
  useEffect(() => {
    if (!hydrated) return
    try { localStorage.setItem(JOB_NOTIFICATIONS_KEY, JSON.stringify(state)) } catch {}
  }, [hydrated, state])

  const checkNow = useCallback(async () => {
    if (inFlight.current || !stateRef.current.preferences.enabled) return
    inFlight.current = true; setChecking(true); setError('')
    try {
      const response = await fetch('/api/live/jobs?refresh=1', { cache:'no-store' })
      if (!response.ok) throw new Error('The public job board could not be reached. Try again later.')
      const parsed = parseJobApiPayload(await response.json())
      if (!parsed) throw new Error('The job board returned an unreadable response.')
      const current = stateRef.current
      if (!current.preferences.enabled) return
      const matched = filterAlertJobs(parsed.postings, current.preferences)
      const changes = detectJobChanges(matched, current.snapshots, current.initialized)
      const existing = new Set(current.notices.map(notice => notice.id))
      const additions = changes.notices.filter(notice => !existing.has(notice.id))
      commit(previous => ({ ...previous, snapshots:changes.snapshots, initialized:true, notices:[...additions, ...previous.notices].slice(0,100), lastCheckedAt:new Date().toISOString(), matchingCount:matched.length }))
      if (additions.length) {
        const newCount = additions.filter(notice => notice.kind === 'new').length
        const changedCount = additions.length - newCount
        toast.success(`${additions.length} job ${additions.length === 1 ? 'update' : 'updates'} found`)
        if (current.preferences.browserNotifications && 'Notification' in window && Notification.permission === 'granted') {
          const parts = [newCount && `${newCount} new`, changedCount && `${changedCount} changed`].filter(Boolean).join(' · ')
          const notification = new Notification('Pivott job updates', { body:parts, icon:'/icon.svg', tag:'pivott-job-updates' })
          notification.onclick = () => { window.focus(); setPanel('updates'); setOpen(true); notification.close() }
        }
      }
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Job updates could not be checked.') }
    finally { inFlight.current = false; setChecking(false) }
  }, [commit])

  useEffect(() => {
    if (!hydrated || autoStarted.current) return
    autoStarted.current = true
    const current = stateRef.current
    if (current.preferences.enabled && current.preferences.checkOnOpen && (current.preferences.intervalMinutes === 0 || dueForCheck(current.lastCheckedAt, current.preferences.intervalMinutes))) void checkNow()
  }, [hydrated, checkNow])
  useEffect(() => {
    if (!hydrated || !state.preferences.enabled || state.preferences.intervalMinutes === 0) return
    const every = state.preferences.intervalMinutes * 60_000
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible' && dueForCheck(stateRef.current.lastCheckedAt, stateRef.current.preferences.intervalMinutes)) void checkNow() }, Math.min(every, 60_000))
    const visible = () => { if (document.visibilityState === 'visible' && dueForCheck(stateRef.current.lastCheckedAt, stateRef.current.preferences.intervalMinutes)) void checkNow() }
    document.addEventListener('visibilitychange', visible)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', visible) }
  }, [hydrated, state.preferences.enabled, state.preferences.intervalMinutes, checkNow])

  function configure(input: JobAlertPreferences) {
    const preferences = sanitizeJobAlertPreferences(input)
    const current = stateRef.current
    const filtersChanged = alertFilterSignature(preferences) !== alertFilterSignature(current.preferences)
    const newlyEnabled = preferences.enabled && !current.preferences.enabled
    const next = { ...current, preferences, ...(filtersChanged || newlyEnabled ? { snapshots:{}, initialized:false, lastCheckedAt:null, matchingCount:0 } : {}), ...(filtersChanged ? { notices:[] } : {}) }
    stateRef.current = next; setState(next)
    if (preferences.enabled) window.setTimeout(() => void checkNow(), 0)
  }
  function openCenter(nextPanel?: Panel) { setPanel(nextPanel ?? (stateRef.current.preferences.enabled ? 'updates' : 'settings')); setOpen(true) }
  function markAllRead() { commit(previous => ({ ...previous, notices:previous.notices.map(notice => ({ ...notice, read:true })) })) }
  function markRead(id: string) { commit(previous => ({ ...previous, notices:previous.notices.map(notice => notice.id === id ? { ...notice, read:true } : notice) })) }
  function clearNotices() { commit(previous => ({ ...previous, notices:[] })) }
  const value = { state, checking, error, openCenter, checkNow, configure, markAllRead, markRead, clearNotices }
  return <Context.Provider value={value}>{children}<JobNotificationCenter open={open} onOpenChange={setOpen} panel={panel} onPanelChange={setPanel}/></Context.Provider>
}

export function JobNotificationButton() {
  const { state, openCenter } = useJobNotifications()
  const unread = state.notices.filter(notice => !notice.read).length
  return <button type="button" onClick={() => openCenter()} className={cn(pButton({ variant:'ghost', size:'icon-sm' }), 'relative')} aria-label={unread ? `Job updates, ${unread} unread` : 'Job updates'}>{unread ? <BellRing aria-hidden /> : <Bell aria-hidden />}{unread > 0 && <span className="absolute right-0.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] leading-4 text-primary-foreground" aria-hidden>{unread > 9 ? '9+' : unread}</span>}</button>
}

function JobNotificationCenter({ open, onOpenChange, panel, onPanelChange }: { open:boolean; onOpenChange:(value:boolean)=>void; panel:Panel; onPanelChange:(panel:Panel)=>void }) {
  const { state, checking, error, checkNow, configure, markAllRead, markRead, clearNotices } = useJobNotifications()
  const [draft, setDraft] = useState(state.preferences)
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>('unsupported')
  useEffect(() => { if (open) { setDraft(state.preferences); setPermission('Notification' in window ? Notification.permission : 'unsupported') } }, [open, state.preferences])
  const families = useMemo(() => Array.from(new Set(roles.map(role => role.family))).map(family => ({ family, roles:roles.filter(role => role.family === family) })), [])
  const unread = state.notices.filter(notice => !notice.read).length
  async function requestBrowserNotifications() {
    if (!('Notification' in window)) return
    const result = await Notification.requestPermission(); setPermission(result)
    setDraft(current => ({ ...current, browserNotifications:result === 'granted' }))
  }
  function toggleRole(roleId: string, checked: boolean) { setDraft(current => ({ ...current, roleIds:checked ? [...current.roleIds, roleId] : current.roleIds.filter(id => id !== roleId) })) }
  function save() { configure(draft); toast.success(draft.enabled ? 'Job update preferences saved' : 'Job updates paused'); onPanelChange('updates') }
  const intervalLabels: Record<CheckInterval,string> = { 0:'No repeating checks', 30:'Every 30 minutes', 60:'Every hour', 240:'Every 4 hours' }
  return <Sheet open={open} onOpenChange={onOpenChange}><SheetContent side="right" className="!w-full !max-w-xl overflow-hidden"><SheetHeader className="border-b border-border pr-12"><SheetTitle className="text-xl">Job updates</SheetTitle><SheetDescription>New and changed public listings that match your choices.</SheetDescription></SheetHeader><div className="grid grid-cols-2 border-b border-border px-4" role="tablist" aria-label="Job update sections"><button type="button" role="tab" aria-selected={panel === 'updates'} className={cn('min-h-11 border-b-2 px-3 text-sm font-medium', panel === 'updates' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground')} onClick={() => onPanelChange('updates')}>Updates{unread ? ` (${unread})` : ''}</button><button type="button" role="tab" aria-selected={panel === 'settings'} className={cn('min-h-11 border-b-2 px-3 text-sm font-medium', panel === 'settings' ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground')} onClick={() => onPanelChange('settings')}>Preferences</button></div>
    {panel === 'updates' ? <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="flex flex-wrap items-center gap-2"><PButton size="sm" onClick={() => void checkNow()} loading={checking} disabled={!state.preferences.enabled}><RefreshCw aria-hidden />Check now</PButton><PButton size="sm" variant="secondary" onClick={() => onPanelChange('settings')}><SlidersHorizontal aria-hidden />Customize</PButton>{unread > 0 && <PButton size="sm" variant="ghost" onClick={markAllRead}><CheckCheck aria-hidden />Mark all read</PButton>}</div>{error && <p role="alert" className="mt-4 rounded-lg border border-destructive/30 p-3 text-sm text-destructive">{error}</p>}<StatusSummary state={state}/>{state.notices.length === 0 ? <div className="mt-8 rounded-xl border border-dashed border-border p-6 text-center"><BriefcaseBusiness className="mx-auto size-6 text-muted-foreground" aria-hidden/><h3 className="mt-3 font-medium">No job updates yet</h3><p className="mt-2 text-sm text-muted-foreground">{state.preferences.enabled ? state.initialized ? 'Pivott will show new or changed matching listings here.' : 'Run the first check to set a baseline. Existing listings will not trigger a flood of alerts.' : 'Turn on updates and choose what you want to follow.'}</p>{!state.preferences.enabled && <PButton className="mt-4" size="sm" onClick={() => onPanelChange('settings')}>Set up job updates</PButton>}</div> : <ul className="mt-5 grid gap-3">{state.notices.map(notice => <li key={notice.id} className={cn('rounded-xl border p-4', notice.read ? 'border-border bg-card' : 'border-primary/40 bg-primary/5')}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-medium uppercase tracking-wide text-primary">{notice.kind === 'new' ? 'New listing' : 'Listing changed'}</p><h3 className="mt-1 font-semibold">{notice.job.title}</h3><p className="mt-1 text-sm text-muted-foreground">{notice.job.company || 'Company not supplied'}</p></div>{!notice.read && <><span className="mt-1 size-2 shrink-0 rounded-full bg-primary" aria-hidden/><span className="sr-only">Unread</span></>}</div><p className="mt-3 flex items-center gap-2 text-sm"><MapPin className="size-4 shrink-0" aria-hidden/>{notice.job.location || 'Location not supplied'}{notice.job.remote ? ' · Remote' : ''}</p><div className="mt-3 flex items-center justify-between gap-3"><time className="text-xs text-muted-foreground" dateTime={notice.createdAt}>{new Date(notice.createdAt).toLocaleString()}</time><a href={notice.job.url} target="_blank" rel="noreferrer" onClick={() => markRead(notice.id)} className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary underline">View listing<ExternalLink className="size-4" aria-hidden/></a></div></li>)}</ul>}{state.notices.length > 0 && <PButton className="mt-5" size="sm" variant="ghost" onClick={clearNotices}><Trash2 aria-hidden/>Clear update history</PButton>}<p className="mt-6 text-xs leading-relaxed text-muted-foreground">Checks run only while Pivott is open. Browser alerts also require this site to remain open; Pivott does not send email or background push notifications.</p></div> : <div className="min-h-0 flex-1 overflow-y-auto p-4"><div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4"><div><p className="font-medium">Job updates</p><p className="mt-1 text-xs text-muted-foreground">Compare public listings against your saved choices.</p></div><input aria-label="Enable job updates" type="checkbox" className="size-5 accent-primary" checked={draft.enabled} onChange={event => setDraft({ ...draft, enabled:event.target.checked })}/></div><fieldset className="mt-6"><legend className="font-medium">Roles</legend><p className="mt-1 text-xs text-muted-foreground">Leave every role unselected to follow all 20 roles. Changing matching filters starts a fresh baseline and clears the previous update history.</p><div className="mt-3 flex gap-3"><button type="button" className="min-h-11 text-sm text-primary underline" onClick={() => setDraft({ ...draft, roleIds:roles.map(role => role.id) })}>Select all</button><button type="button" className="min-h-11 text-sm text-primary underline" onClick={() => setDraft({ ...draft, roleIds:[] })}>Clear</button></div><div className="max-h-64 space-y-4 overflow-y-auto rounded-xl border border-border p-4">{families.map(group => <div key={group.family}><p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.family}</p><div className="mt-2 grid gap-2">{group.roles.map(role => <label key={role.id} className="flex min-h-9 items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={draft.roleIds.includes(role.id)} onChange={event => toggleRole(role.id, event.target.checked)}/><span>{role.title}</span></label>)}</div></div>)}</div></fieldset><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="grid gap-2 text-sm font-medium">Keywords<input className="pivott-input font-normal" value={draft.keywords} maxLength={120} placeholder="Python, research, sustainability" onChange={event => setDraft({ ...draft, keywords:event.target.value })}/><span className="text-xs font-normal text-muted-foreground">Separate alternatives with commas.</span></label><label className="grid gap-2 text-sm font-medium">Location contains<input className="pivott-input font-normal" value={draft.location} maxLength={120} placeholder="Kuala Lumpur or Malaysia" onChange={event => setDraft({ ...draft, location:event.target.value })}/><span className="text-xs font-normal text-muted-foreground">Matches the location supplied by the job board.</span></label><label className="grid gap-2 text-sm font-medium">Work arrangement<select className="pivott-input font-normal" value={draft.workplace} onChange={event => setDraft({ ...draft, workplace:event.target.value as WorkplacePreference })}><option value="all">Remote and location-based</option><option value="remote">Remote only</option><option value="location">Location-based only</option></select></label><label className="grid gap-2 text-sm font-medium">Check frequency<select className="pivott-input font-normal" value={draft.intervalMinutes} onChange={event => setDraft({ ...draft, intervalMinutes:Number(event.target.value) as CheckInterval })}>{([0,30,60,240] as CheckInterval[]).map(value => <option key={value} value={value}>{intervalLabels[value]}</option>)}</select></label></div><label className="mt-5 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={draft.checkOnOpen} onChange={event => setDraft({ ...draft, checkOnOpen:event.target.checked })}/>Check when I open Pivott</label><div className="mt-5 rounded-xl border border-border p-4"><p className="font-medium">Browser notifications</p><p className="mt-1 text-xs text-muted-foreground">Optional alerts while Pivott is open. Permission: {permission}.</p>{permission === 'granted' ? <label className="mt-3 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" className="size-4 accent-primary" checked={draft.browserNotifications} onChange={event => setDraft({ ...draft, browserNotifications:event.target.checked })}/>Show browser notifications</label> : permission === 'denied' ? <p className="mt-3 text-sm">Notifications are blocked in this browser. You can change the permission in your browser’s site settings.</p> : permission === 'unsupported' ? <p className="mt-3 text-sm">This browser does not support page notifications.</p> : <PButton className="mt-3" type="button" size="sm" variant="secondary" onClick={() => void requestBrowserNotifications()}>Allow browser notifications</PButton>}</div><div className="sticky bottom-0 -mx-4 mt-6 flex flex-wrap justify-end gap-3 border-t border-border bg-popover px-4 py-4"><PButton variant="ghost" onClick={() => setDraft(state.preferences)}>Reset changes</PButton><PButton onClick={save}>Save preferences</PButton></div></div>}
  </SheetContent></Sheet>
}

function StatusSummary({ state }: { state: JobNotificationState }) {
  if (!state.preferences.enabled) return <p className="mt-4 text-sm text-muted-foreground">Job updates are paused.</p>
  if (!state.lastCheckedAt) return <p className="mt-4 text-sm text-muted-foreground">No successful check yet.</p>
  return <p role="status" className="mt-4 text-sm text-muted-foreground">Last checked {new Date(state.lastCheckedAt).toLocaleString()} · {state.matchingCount} matching {state.matchingCount === 1 ? 'listing' : 'listings'} in the latest feed.</p>
}
