'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PButton, PLink } from '@/components/pivott/p-button'
import { getSupabase, accountSavingConfigured } from '@/lib/supabase'
const returnPath = () => { const value = new URLSearchParams(window.location.search).get('next'); return value && ['/workspace', '/account', '/start', '/map', '/skills', '/routes', '/pathway', '/passport', '/signals'].includes(value) ? value : '/workspace' }
export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const handled = useRef(false)
  const router = useRouter()
  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const code = new URLSearchParams(window.location.search).get('code')
    if (new URLSearchParams(window.location.search).has('error') || new URLSearchParams(window.location.hash.slice(1)).has('error')) setMessage('This sign-in link could not be used. Request a new link below; your device work is unchanged.')
    const client = getSupabase()
    if (code && client) {
      setBusy(true)
      void client.auth.exchangeCodeForSession(code).then(({ error }) => {
        window.history.replaceState(null, '', `/signin?next=${encodeURIComponent(returnPath())}`)
        setBusy(false)
        if (error) setMessage('This link could not be used. It may have expired. Request a new one below.')
        else router.replace(returnPath())
      }).catch(() => { setBusy(false); setMessage('Could not complete sign-in. Check your connection and request a new link.') })
    }
  }, [router])
  useEffect(() => { if (!cooldown) return; const timer = setTimeout(() => setCooldown(cooldown - 1), 1000); return () => clearTimeout(timer) }, [cooldown])
  return <div className="mx-auto max-w-lg px-5 py-12"><h1 className="text-3xl font-semibold tracking-tight">Save your work</h1><p className="mt-3 text-sm leading-relaxed text-muted-foreground">An optional account keeps one work profile and plan across devices. You can continue on this device without signing in.</p>
    {!accountSavingConfigured ? <div className="mt-6 rounded-xl border border-border bg-card p-5"><p className="text-sm leading-relaxed">Account saving is not configured for this deployment yet. Your work can still be saved on this device.</p></div> : <form className="mt-6 flex flex-col gap-4 rounded-xl border border-border bg-card p-6" onSubmit={async (event) => {
      event.preventDefault();const client = getSupabase();if (!client || busy || cooldown) return
      setBusy(true);setMessage('')
      try { const { error } = await client.auth.signInWithOtp({ email: email.trim(), options: { shouldCreateUser: true, emailRedirectTo: `${window.location.origin}/signin?next=${encodeURIComponent(returnPath())}` } });if(error) throw error;setMessage('Check your email for a sign-in link. If delivery is available for this address, a link is on its way.');setCooldown(60) }
      catch { setMessage('Could not request a link. Check your connection and try again. Your work is still on this device.') }
      finally { setBusy(false) }
    }}>
      <label className="flex flex-col gap-2 text-sm font-medium">Email address<input className="pivott-input" type="email" name="email" autoComplete="email" inputMode="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
      <PButton type="submit" loading={busy} disabled={cooldown > 0}>{cooldown ? `Resend available in ${cooldown}s` : 'Send sign-in link'}</PButton>
      <p className="text-xs leading-relaxed text-muted-foreground">Open the link in this browser. If it expires or you switch browsers, request a new link. Signing in does not automatically replace or merge your device profile.</p>
    </form>}
    <p role="status" className="mt-4 text-sm leading-relaxed">{message}</p><PLink href="/workspace" variant="secondary" className="mt-5">Continue on this device</PLink>
  </div>
}
