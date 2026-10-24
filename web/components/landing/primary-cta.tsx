'use client'
import { ArrowRight } from 'lucide-react'
import { PLink } from '@/components/pivott/p-button'
import { trackEvent } from '@/lib/analytics'

export function PrimaryCta() {
  return <PLink href="/start" size="lg" onClick={() => trackEvent('start_task_map')}>Map my work<ArrowRight aria-hidden /></PLink>
}
