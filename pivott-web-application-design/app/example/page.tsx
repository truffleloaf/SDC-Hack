'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LogoMark } from '@/components/pivott/logo'
import { enterDemo } from '@/lib/store'
import { demoPersona, hasDemoPersona, roleById } from '@/lib/data/seed'

export default function ExamplePage() {
  const router = useRouter()
  useEffect(() => {
    if (!hasDemoPersona) {
      router.replace('/start')
      return
    }
    enterDemo()
    router.replace('/map')
  }, [router])

  return (
    <div className="grid min-h-[60vh] place-items-center px-5" role="status">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark animated className="size-14 text-foreground" />
        <p className="font-serif text-2xl">Opening the sample profile…</p>
        <p className="text-sm text-muted-foreground">{roleById[demoPersona.roleId]?.title} · Sample profile, not a real person</p>
      </div>
    </div>
  )
}
