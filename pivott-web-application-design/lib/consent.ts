export type ConsentChoice = 'accepted' | 'rejected'
export const CONSENT_KEY = 'pivott:analytics-consent:v1'
export const CONSENT_EVENT = 'pivott:consent-change'

export function readConsent(): ConsentChoice | null {
  if (typeof window === 'undefined') return null
  try {
    const value = window.localStorage.getItem(CONSENT_KEY)
    return value === 'accepted' || value === 'rejected' ? value : null
  } catch { return null }
}

export function saveConsent(choice: ConsentChoice) {
  try { window.localStorage.setItem(CONSENT_KEY, choice) } catch {}
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }))
}

export function openCookieSettings() { window.dispatchEvent(new Event('pivott:open-cookie-settings')) }
