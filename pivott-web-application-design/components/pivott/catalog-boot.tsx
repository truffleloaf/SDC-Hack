'use client'

import type { ReactNode } from 'react'
import { applyCatalog, resetCatalog, type CatalogPayload } from '@/lib/data/seed'

/**
 * Applies the catalogue fetched by the root layout before any page renders.
 *
 * The catalogue lives in module-level `let` bindings (`lib/data/seed.ts`), so
 * pages can keep importing `roleById`, `skills`, … synchronously. Running this
 * on the server and again on the client keeps SSR HTML and hydration equal.
 */
export function CatalogBoot({
  payload,
  children,
}: {
  payload: CatalogPayload | null
  children: ReactNode
}) {
  if (payload) applyCatalog(payload)
  else resetCatalog()
  return <>{children}</>
}