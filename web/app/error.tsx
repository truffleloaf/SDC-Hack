'use client'
import { ErrorState } from '@/components/pivott/states'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-xl px-5 py-16"><ErrorState onRetry={reset} /></div>
}
