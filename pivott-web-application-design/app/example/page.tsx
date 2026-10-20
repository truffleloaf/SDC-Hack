'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { LogoMark } from '@/components/pivott/logo'
import { enterDemo } from '@/lib/store'

export default function ExamplePage() {
  const router = useRouter()
  useEffect(() => {
    enterDemo()
    const t = setTimeout(() => router.replace('/map'), 700)
    return () => clearTimeout(t)
  }, [router])

  return (
    <div className="grid min-h-[60vh] place-items-center px-5" role="status">
      <div className="flex flex-col items-center gap-4 text-center">
        <LogoMark animated className="size-14 text-foreground" />
        <p className="font-serif text-2xl">Loading Aisyah’s map…</p>
        <p className="text-sm text-muted-foreground">Finance Admin · illustrative demo profile</p>
      </div>
    </div>
  )
}
