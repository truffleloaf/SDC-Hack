'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PButton, PLink } from '@/components/pivott/p-button'
import { getSupabase, accountSavingConfigured } from '@/lib/supabase'
import { safeReturnPath } from '@/lib/auth/flow'
import { useSignIn } from '@/components/account/sign-in-dialog'
export default function SignInPage() {
  const [message, setMessage] = useState('Completing sign-in…')
  const handled = useRef(false)
  const router = useRouter()
  const { openSignIn } = useSignIn()
  useEffect(() => {
    if (handled.current) return
    handled.current = true
    const params = new URLSearchParams(window.location.search)
    const next = safeReturnPath(params.get('next'))
    const code = params.get('code')
    const reset = params.get('reset') === '1'
    const client = getSupabase()
    if (!client || !accountSavingConfigured) { setMessage('Account sync is unavailable here. You can keep working on this device.'); return }
    if (!code) { setMessage(params.has('error') ? 'Sign-in could not be completed. Try again.' : 'Sign in to sync your plan.'); openSignIn(next, reset ? 'update' : 'password'); return }
    void client.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (window.location.pathname !== '/signin') return
      window.history.replaceState(null, '', `/signin?next=${encodeURIComponent(next)}`)
      if (error) { setMessage('The sign-in link is invalid or expired. Request a new one and try again.'); openSignIn(next, reset ? 'forgot' : 'password') }
      else if (reset) { setMessage('Choose a new password to finish.'); openSignIn(next, 'update') }
      else router.replace(next)
    }).catch(() => setMessage('No connection. Your work is still saved on this device.'))
  }, [router, openSignIn])
  return <div className="mx-auto max-w-lg px-5 py-12"><h1 className="text-3xl font-semibold">Sign in</h1><p role="status" className="mt-4 text-sm">{message}</p>{accountSavingConfigured && <PButton className="mt-5" onClick={() => openSignIn(safeReturnPath(new URLSearchParams(window.location.search).get('next')))}>Open sign-in</PButton>}<PLink href="/workspace" variant="secondary" className="mt-5 ml-3">Continue on this device</PLink></div>
}
