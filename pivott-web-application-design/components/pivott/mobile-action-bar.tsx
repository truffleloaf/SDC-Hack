import type { ReactNode } from 'react'

export function MobileActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-x-0 bg-card/90 backdrop-blur-xl bottom-0 z-30 flex gap-3 border-t border-border px-5 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 lg:hidden">
      {children}
    </div>
  )
}
