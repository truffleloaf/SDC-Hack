'use client'
import { track } from '@vercel/analytics'
import { readConsent } from '@/lib/consent'

export function trackEvent(name: string, properties?: Record<string, string | number | boolean | null>) {
  if (readConsent() !== 'accepted') return
  track(name, properties)
}
