'use client'
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PButton } from '@/components/pivott/p-button'
import { getSupabase, accountSavingConfigured } from '@/lib/supabase'
import { initialSignIn, maskedEmail, safeReturnPath, SignInFlow } from '@/lib/auth/flow'

const Context = createContext<{ openSignIn: (next?: string) => void }>({ openSignIn: () => {} })
export function useSignIn() { return useContext(Context) }
function GoogleMark() { return <svg viewBox="0 0 48 48" aria-hidden className="size-5"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.5 9.5 0 0 1-4.1 6.3v5.2h6.7c3.9-3.6 6-8.9 6-15.2Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.9L30.8 34a12.3 12.3 0 0 1-18.2-6.4H5.7v5.3A20.4 20.4 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.6a12.2 12.2 0 0 1 0-7.2v-5.3H5.7a20 20 0 0 0 0 17.8Z"/><path fill="#EA4335" d="M24 12a11 11 0 0 1 7.8 3.1l5.9-5.9A19.7 19.7 0 0 0 24 4 20.4 20.4 0 0 0 5.7 15.1l6.9 5.3A12 12 0 0 1 24 12Z"/></svg> }
export function SignInProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState(initialSignIn)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [now, setNow] = useState(0)
  const next = useRef('/workspace')
  const flow = useRef<SignInFlow | null>(null)
  function close() { flow.current?.reset(); setOpen(false); setCode('') }
  function openSignIn(path?: string) {
    if (!accountSavingConfigured) return
    const client = getSupabase()
    if (!client) return
    flow.current?.reset()
    flow.current = new SignInFlow(client.auth, setState)
    next.current = safeReturnPath(path || window.location.pathname)
    setEmail(''); setCode(''); setState(initialSignIn); setNow(Date.now()); setOpen(true)
  }
  useEffect(() => { if (!open) return; const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer) }, [open])
  useEffect(() => { if (state.step === 'done') close() }, [state.step])
  useEffect(() => () => { flow.current?.reset() }, [])
  const seconds = Math.max(0, Math.ceil((state.resendAt - now) / 1000))
  function enterCode(value: string) { const digits = value.replace(/\D/g, '').slice(0, 6); setCode(digits); if (digits.length === 6) void flow.current?.verify(digits) }
  return <Context.Provider value={{ openSignIn }}>{children}<Dialog open={open} onOpenChange={(value) => !value && close()}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle className="pr-7 text-xl">{state.step === 'code' ? 'Enter your code' : 'Sign in or create an account'}</DialogTitle><DialogDescription>{state.step === 'code' ? `We sent a 6-digit code to ${maskedEmail(state.email)}.` : 'Sync your plan between your phone and laptop. No password.'}</DialogDescription></DialogHeader>
    <p className="text-sm text-muted-foreground">Signing in syncs your plan. If this device and your account have different work, you choose which version to use.</p>
    {state.step === 'email' ? <><button type="button" disabled={state.busy} onClick={() => void flow.current?.google(`${window.location.origin}/signin?next=${encodeURIComponent(next.current)}`)} className="flex min-h-11 items-center justify-center gap-3 rounded border border-[#747775] bg-white px-4 font-medium text-[#1f1f1f] disabled:opacity-50"><GoogleMark />Continue with Google</button><div className="flex items-center gap-3 text-xs text-muted-foreground"><span className="h-px flex-1 bg-border"/>or<span className="h-px flex-1 bg-border"/></div><form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void flow.current?.send(email) }}><label className="flex flex-col gap-2 text-sm font-medium">Email address<input className="pivott-input" type="email" autoComplete="email" name="email" inputMode="email" autoFocus required value={email} aria-invalid={!!state.error} aria-describedby={state.error ? 'sign-in-error' : undefined} onChange={(event) => setEmail(event.target.value)} /></label><PButton type="submit" loading={state.busy} disabled={seconds > 0}>{seconds > 0 ? `Try again in ${seconds}s` : 'Email me a code'}</PButton><p className="text-xs text-muted-foreground">We’ll email a 6-digit code. It expires in 10 minutes.</p></form></> : <form className="flex flex-col gap-4" onSubmit={(event) => { event.preventDefault(); void flow.current?.verify(code) }}><label className="flex flex-col gap-2 text-sm font-medium">6-digit code<input className="pivott-input font-mono tracking-widest" type="text" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]*" maxLength={6} autoFocus required value={code} aria-invalid={!!state.error} aria-describedby={state.error ? 'sign-in-error' : undefined} onChange={(event) => enterCode(event.target.value)} onPaste={(event) => { event.preventDefault(); enterCode(event.clipboardData.getData('text')) }} /></label><PButton type="submit" loading={state.busy} disabled={code.length !== 6}>Verify code</PButton><div className="flex flex-wrap gap-3"><PButton variant="link" type="button" disabled={seconds > 0 || state.busy} onClick={() => { setCode(''); void flow.current?.send(state.email) }}>{seconds ? `Resend code in ${seconds}s` : 'Resend code'}</PButton><PButton variant="link" type="button" onClick={() => { flow.current?.changeEmail(); setCode('') }}>Use a different email</PButton></div><p className="text-xs text-muted-foreground">Not there? Check spam or promotions.</p></form>}
    {state.error && <div><p role="alert" id="sign-in-error" className="text-sm text-destructive">{state.error}</p>{state.error.startsWith('No connection') && <PButton variant="link" onClick={() => state.step === 'code' ? void flow.current?.verify(code) : void flow.current?.send(email)}>Try again</PButton>}</div>}
    <PButton variant="ghost" onClick={close}>Continue without an account</PButton>
  </DialogContent></Dialog></Context.Provider>
}
