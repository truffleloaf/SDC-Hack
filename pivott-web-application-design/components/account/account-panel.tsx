'use client'
import { useAccount } from './account-provider'
import { PButton, PLink } from '@/components/pivott/p-button'
export function AccountPanel() {
  const account = useAccount()
  return <section id="account" className="mt-10 border-t border-border pt-6"><h2 className="text-lg font-semibold">Saving and account</h2>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Guest work is stored in this browser. Signing in lets you explicitly save a copy of your profile, tasks, ratings, added signals, saved routes and plan progress in your account. It is not uploaded automatically.</p>
    <p role="status" className="mt-3 text-sm">{account.status}</p>
    {account.user ? <><p className="mt-2 text-sm text-muted-foreground">Signed in as {account.user.email}</p><div className="mt-4 flex flex-wrap gap-3"><PButton size="sm" loading={account.status.startsWith('Saving')} onClick={() => void account.save()}>Save to account</PButton><PButton size="sm" variant="secondary" onClick={() => void account.refresh()}>Reload account / Retry</PButton><PButton size="sm" variant="ghost" onClick={() => void account.signOut()}>Sign out · Keep device work</PButton></div><button className="mt-5 min-h-11 text-sm text-destructive" onClick={() => void account.deleteAccount()}>Delete account and its saved profile</button></> : <PLink className="mt-4" size="sm" variant="secondary" href="/signin">{account.configured ? 'Create account / Sign in' : 'About account saving'}</PLink>}
  </section>
}
