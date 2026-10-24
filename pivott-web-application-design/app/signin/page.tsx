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
    const client = getSupabase()
    if (!client || !accountSavingConfigured) { setMessage('Account sync is unavailable here. You can keep working on this device.'); return }
    if (!code) { setMessage(params.has('error') ? 'Google sign-in could not be completed. Try again or use an email code.' : 'Sign in to sync your plan.'); openSignIn(next); return }
    void client.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (window.location.pathname !== '/signin') return
      window.history.replaceState(null, '', `/signin?next=${encodeURIComponent(next)}`)
      if (error) { setMessage('Google sign-in could not be completed. Try again or use an email code.'); openSignIn(next) }
      else router.replace(next)
    }).catch(() => setMessage('No connection. Your work is still saved on this device.'))
  }, [router, openSignIn])
  return <div className="mx-auto max-w-lg px-5 py-12"><h1 className="text-3xl font-semibold">Sign in</h1><p role="status" className="mt-4 text-sm">{message}</p>{accountSavingConfigured && <PButton className="mt-5" onClick={() => openSignIn(safeReturnPath(new URLSearchParams(window.location.search).get('next')))}>Open sign-in</PButton>}<PLink href="/workspace" variant="secondary" className="mt-5 ml-3">Continue on this device</PLink></div>
}
