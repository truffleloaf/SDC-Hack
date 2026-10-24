'use client'
import { useEffect, useState } from 'react'
import { Analytics } from '@vercel/analytics/next'
import { CONSENT_EVENT, openCookieSettings, readConsent, saveConsent, type ConsentChoice } from '@/lib/consent'

export function ConsentControls() {
  const [choice, setChoice] = useState<ConsentChoice | null>(null)
  const [show, setShow] = useState(false)
  useEffect(() => {
    const current = readConsent()
    setChoice(current); setShow(current === null)
    const reopen = () => setShow(true)
    const changed = (event: Event) => setChoice((event as CustomEvent<ConsentChoice>).detail)
    window.addEventListener('pivott:open-cookie-settings', reopen)
    window.addEventListener(CONSENT_EVENT, changed)
    return () => { window.removeEventListener('pivott:open-cookie-settings', reopen); window.removeEventListener(CONSENT_EVENT, changed) }
  }, [])
  function choose(value: ConsentChoice) { saveConsent(value); setChoice(value); setShow(false) }
  return <>
    {process.env.NODE_ENV === 'production' && choice === 'accepted' && <Analytics />}
    {show && <aside aria-label="Cookie choices" className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-2xl rounded-xl border border-border bg-card p-4 shadow-lift sm:bottom-5 sm:p-5"><h2 className="font-semibold">Your privacy choices</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Pivott stores essential settings on this device. With your permission, privacy-friendly Vercel Analytics also records anonymous page visits and use of the main “Map my work” action. It does not receive your résumé, task ratings or email address.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" className="min-h-11 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" onClick={() => choose('accepted')}>Allow analytics</button><button type="button" className="min-h-11 rounded-lg border border-border bg-card px-4 text-sm font-medium" onClick={() => choose('rejected')}>Essential only</button><a className="inline-flex min-h-11 items-center px-1 text-sm underline" href="/privacy#cookies">Learn more</a></div></aside>}
  </>
}

export function CookieSettingsButton() {
  return <button type="button" onClick={openCookieSettings} className="min-h-11 underline">Cookie choices</button>
}
