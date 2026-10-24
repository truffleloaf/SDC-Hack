'use client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PButton } from '@/components/pivott/p-button'
import { getSupabase, accountSavingConfigured } from '@/lib/supabase'
import { initialSignIn, maskedEmail, safeReturnPath, SignInFlow } from '@/lib/auth/flow'

type SignInView = 'password' | 'code' | 'forgot' | 'update'
const Context = createContext<{ openSignIn: (next?: string, view?: SignInView) => void }>({ openSignIn: () => {} })
export function useSignIn() { return useContext(Context) }
function GoogleMark() { return <svg viewBox="0 0 48 48" aria-hidden className="size-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.3v5.2h6.7c3.9-3.6 6-8.9 6-15.2Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9L30.8 34a12.3 12.3 0 0 1-18.2-6.4H5.7v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12.2 12.2 0 0 1 0-7.2v-5.3H5.7a20 20 0 0 0 0 17.8Z"/><path fill="#EA4335" d="M24 12a11 11 0 0 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20.4 20.4 0 0 0 5.7 15.1l6.9 5.3A12 12 0 0 1 24 12Z"/></svg> }

export function SignInProvider({ children }: { children: ReactNode }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(initialSignIn)
  const [view, setView] = useState<SignInView>('password')
  const [creating, setCreating] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [code, setCode] = useState('')
  const [website, setWebsite] = useState('')
  const [now, setNow] = useState(0)
  const next = useRef('/workspace')
  const flow = useRef<SignInFlow | null>(null)
  function close() { flow.current?.reset(); setOpen(false); setCode(''); setPassword(''); setConfirmPassword(''); setWebsite('') }
  function openSignIn(path?: string, initialView: SignInView = 'password') {
    if (!accountSavingConfigured) return
    const client = getSupabase()
    if (!client) return
    flow.current?.reset()
    flow.current = new SignInFlow(client.auth, setState)
    next.current = safeReturnPath(path || window.location.pathname)
    setEmail(''); setCode(''); setPassword(''); setConfirmPassword(''); setWebsite(''); setCreating(false); setView(initialView); setState(initialSignIn); setNow(Date.now()); setOpen(true)
  }
  useEffect(() => { if (!open) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [open])
  useEffect(() => { if (state.step !== 'done') return; const destination = next.current; close(); router.replace(destination) }, [state.step, router])
  useEffect(() => () => { flow.current?.reset() }, [])
  const seconds = Math.max(0, Math.ceil((state.resendAt - now) / 1000))
  const redirectTo = () => `${window.location.origin}/signin?next=${encodeURIComponent(next.current)}`
  const resetRedirectTo = () => `${window.location.origin}/signin?reset=1&next=${encodeURIComponent(next.current)}`
  function enterCode(value: string) { const digits = value.replace(/\D/g, '').slice(0, 6); setCode(digits); if (digits.length === 6) void flow.current?.verify(digits) }
  function submitPassword() {
    if (website) return
    if (creating && password !== confirmPassword) { setState({ ...state, error: 'The passwords do not match.', notice: '' }); return }
    void flow.current?.password(email, password, creating, redirectTo())
  }
  const title = view === 'update' ? 'Choose a new password' : view === 'forgot' ? 'Reset your password' : state.step === 'code' ? 'Enter your code' : creating ? 'Create your account' : 'Sign in'
  const description = view === 'update' ? 'Use 8–72 characters. A longer passphrase is easier to remember.' : view === 'forgot' ? 'We’ll send a secure reset link if an account uses this address.' : state.step === 'code' ? `We sent a 6-digit code to ${maskedEmail(state.email)}.` : 'Save your plan and use it across your devices.'
  return <Context.Provider value={{ openSignIn }}>{children}<Dialog open={open} onOpenChange={(value) => !value && !state.busy && close()}><DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-md"><DialogHeader><DialogTitle className="pr-7 text-xl">{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
    {view !== 'update' && state.step === 'email' && <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Sign-in method"><button className={`min-h-10 rounded-md px-3 text-sm font-medium ${view === 'password' || view === 'forgot' ? 'bg-card shadow-sm' : ''}`} type="button" role="tab" aria-selected={view === 'password' || view === 'forgot'} onClick={() => { setView('password'); setState({ ...initialSignIn }); setCode('') }}>Password</button><button className={`min-h-10 rounded-md px-3 text-sm font-medium ${view === 'code' ? 'bg-card shadow-sm' : ''}`} type="button" role="tab" aria-selected={view === 'code'} onClick={() => { setView('code'); setState({ ...initialSignIn }); setCode('') }}>Email code</button></div>}
    {view !== 'update' && state.step === 'email' && view !== 'forgot' && <><button type="button" disabled={state.busy} onClick={() => !website && void flow.current?.google(redirectTo())} className="flex min-h-11 items-center justify-center gap-3 rounded border border-[#747775] bg-white px-4 font-medium text-[#1f1f1f] disabled:opacity-50"><GoogleMark />Continue with Google</button><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>or<span className="h-px flex-1 bg-border"/></div></>}
    {view === 'password' && state.step === 'email' && <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); submitPassword() }}><SpamField value={website} onChange={setWebsite}/><label className="flex flex-col gap-2 text-sm font-medium">Email address<input className="pivott-input" type="email" autoComplete="email" name="email" inputMode="email" maxLength={254} autoFocus required value={email} aria-invalid={!!state.error} onChange={(event) => setEmail(event.target.value)} /></label><label className="flex flex-col gap-2 text-sm font-medium">Password<input className="pivott-input" type="password" autoComplete={creating ? 'new-password' : 'current-password'} name="password" minLength={8} maxLength={72} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>{creating && <label className="flex flex-col gap-2 text-sm font-medium">Confirm password<input className="pivott-input" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label>}<PButton type="submit" loading={state.busy}>{creating ? 'Create account' : 'Sign in with password'}</PButton><div className="flex flex-wrap justify-between gap-2"><PButton variant="link" type="button" disabled={state.busy} onClick={() => { setCreating(!creating); setState({ ...initialSignIn }); setPassword(''); setConfirmPassword('') }}>{creating ? 'I already have an account' : 'Create an account'}</PButton>{!creating && <PButton variant="link" type="button" disabled={state.busy} onClick={() => { setView('forgot'); setState({ ...initialSignIn }) }}>Forgot password?</PButton>}</div></form>}
    {view === 'code' && state.step === 'email' && <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (!website) void flow.current?.send(email) }}><SpamField value={website} onChange={setWebsite}/><label className="flex flex-col gap-2 text-sm font-medium">Email address<input className="pivott-input" type="email" autoComplete="email" name="email" inputMode="email" maxLength={254} autoFocus required value={email} aria-invalid={!!state.error} onChange={(event) => setEmail(event.target.value)} /></label><PButton type="submit" loading={state.busy} disabled={seconds > 0}>{seconds > 0 ? `Try again in ${seconds}s` : 'Email me a code'}</PButton><p className="text-xs text-muted-foreground">The six-digit code expires after 10 minutes.</p></form>}
    {state.step === 'code' && <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void flow.current?.verify(code) }}><label className="flex flex-col gap-2 text-sm font-medium">6-digit code<input className="pivott-input font-mono tracking-widest" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus required value={code} aria-invalid={!!state.error} onChange={(event) => enterCode(event.target.value)} onPaste={(event) => { event.preventDefault(); enterCode(event.clipboardData.getData('text')) }} /></label><PButton type="submit" loading={state.busy} disabled={code.length !== 6}>Verify code</PButton><div className="flex flex-wrap gap-3"><PButton variant="link" type="button" disabled={seconds > 0 || state.busy} onClick={() => { setCode(''); void flow.current?.send(state.email) }}>{seconds ? `Resend code in ${seconds}s` : 'Resend code'}</PButton><PButton variant="link" type="button" disabled={state.busy} onClick={() => { flow.current?.changeEmail(); setCode('') }}>Use a different email</PButton></div><p className="text-xs text-muted-foreground">Not there? Check spam or promotions.</p></form>}
    {view === 'forgot' && state.step === 'email' && <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (!website) void flow.current?.resetPassword(email, resetRedirectTo()) }}><SpamField value={website} onChange={setWebsite}/><label className="flex flex-col gap-2 text-sm font-medium">Email address<input className="pivott-input" type="email" autoComplete="email" inputMode="email" maxLength={254} autoFocus required value={email} onChange={(event) => setEmail(event.target.value)} /></label><PButton type="submit" loading={state.busy}>Send reset email</PButton><PButton variant="link" type="button" onClick={() => { setView('password'); setState({ ...initialSignIn }) }}>Back to sign in</PButton></form>}
    {view === 'update' && <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); if (password !== confirmPassword) { setState({ ...state, error: 'The passwords do not match.', notice: '' }); return }; void flow.current?.updatePassword(password) }}><label className="flex flex-col gap-2 text-sm font-medium">New password<input className="pivott-input" type="password" autoComplete="new-password" minLength={8} maxLength={72} autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} /></label><label className="flex flex-col gap-2 text-sm font-medium">Confirm new password<input className="pivott-input" type="password" autoComplete="new-password" minLength={8} maxLength={72} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} /></label><PButton type="submit" loading={state.busy}>Save new password</PButton></form>}
    {state.notice && <p role="status" className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">{state.notice}</p>}
    {state.error && <div><p role="alert" id="sign-in-error" className="text-sm text-destructive">{state.error}</p></div>}
    <p className="text-xs leading-relaxed text-muted-foreground">By using an account, you agree to the <Link className="underline" href="/terms" onClick={close}>Terms</Link> and acknowledge the <Link className="underline" href="/privacy" onClick={close}>Privacy Policy</Link>.</p>
    {view !== 'update' && <PButton variant="ghost" disabled={state.busy} onClick={close}>Continue without an account</PButton>}
  </DialogContent></Dialog></Context.Provider>
}

function SpamField({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <label className="absolute -left-[10000px] top-auto size-px overflow-hidden" aria-hidden="true">Website<input type="text" name="website" tabIndex={-1} autoComplete="off" value={value} onChange={(event) => onChange(event.target.value)} /></label>
}
