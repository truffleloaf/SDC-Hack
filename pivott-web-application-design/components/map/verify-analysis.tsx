'use client'

import { useEffect, useRef, useState } from 'react'
import { ShieldCheck } from 'lucide-react'
import { PButton } from '@/components/pivott/p-button'
import { analysisRequest, compareAnalysis, fetchAnalysis } from '@/lib/remote'
import type { AppState } from '@/lib/store'

export function VerifyAnalysis({ state }: { state: AppState }) {
  const inputKey = JSON.stringify(analysisRequest(state))
  const [pendingKey, setPendingKey] = useState<string | null>(null)
  const [result, setResult] = useState<{ inputKey: string; message: string } | null>(null)
  const controller = useRef<AbortController | null>(null)
  // Changing inputs or leaving the map invalidates any in-flight response.
  useEffect(() => () => controller.current?.abort(), [inputKey])

  async function verify() {
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    const timeout = setTimeout(() => request.abort('timeout'), 15000)
    setPendingKey(inputKey)
    setResult(null)
    try {
      const remote = await fetchAnalysis(state, { signal: request.signal })
      if (request.signal.aborted) return
      const compared = compareAnalysis(state, remote)
      const message = compared.matches
        ? `Matches API: ${compared.matchedTasks}/${compared.totalTasks} tasks, role exposure matches, route order identical.`
        : `API differs: ${compared.matchedTasks}/${compared.totalTasks} task exposures match; role exposure ${compared.roleExposureMatches ? 'matches' : 'differs'}; route order ${compared.routeOrderMatches ? 'matches' : 'differs'}.`
      setResult({ inputKey, message })
    } catch {
      if (!request.signal.aborted || request.signal.reason === 'timeout') {
        setResult({ inputKey, message: 'Could not verify with the API. Your local results still work; try again when connected.' })
      }
    } finally {
      clearTimeout(timeout)
      if (!request.signal.aborted || request.signal.reason === 'timeout') setPendingKey(null)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 border-t border-border pt-4">
      <PButton variant="secondary" size="sm" loading={pendingKey === inputKey} onClick={verify}>
        <ShieldCheck aria-hidden />Verify with API
      </PButton>
      <p className="text-xs leading-relaxed text-muted-foreground">This check sends task and skill inputs to the API. Your name and progress stay in this browser.</p>
      <p role="status" aria-live="polite" className="text-sm leading-relaxed text-foreground">{result?.inputKey === inputKey ? result.message : ''}</p>
    </div>
  )
}
