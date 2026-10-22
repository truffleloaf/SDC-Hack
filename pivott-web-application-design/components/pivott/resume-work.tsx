'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppState } from '@/lib/store'
export function ResumeWork() {
  const { state, hydrated } = useAppState()
  const router = useRouter()
  useEffect(() => {
    if (hydrated && state.roleId && state.mode === 'personal' && !new URLSearchParams(window.location.search).has('welcome')) router.replace('/workspace')
  }, [hydrated, state.roleId, state.mode, router])
  return null
}
