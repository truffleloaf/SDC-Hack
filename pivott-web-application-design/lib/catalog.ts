import {
  applyCatalog,
  resetCatalog,
  type CatalogPayload,
} from './data/seed'

/**
 * Where the FastAPI backend lives.
 *
 * Local default is :8001 (the live dataset). Override with
 * `NEXT_PUBLIC_API_BASE` when the API is deployed elsewhere, or with
 * `PIVOTT_API_BASE` for a server-only URL.
 */
export const API_BASE = (
  process.env.PIVOTT_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  'http://127.0.0.1:8001'
).replace(/\/+$/, '')

const PAYLOAD_TTL_MS = 30_000
const MISS_TTL_MS = 30_000
// Unit tests must be deterministic and must not depend on a running FastAPI.
const isUnitTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST)

let cached: { payload: CatalogPayload | null; at: number } | null = null
let inFlight: Promise<CatalogPayload | null> | null = null

/**
 * Fetch the live catalogue from `GET /api/seed`.
 *
 * Returns null when the backend is unreachable or answers with an unexpected
 * shape; the caller then keeps the built-in demo seed so the app still works.
 */
export async function fetchCatalog(timeoutMs = 2500): Promise<CatalogPayload | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE}/api/seed`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return null
    const payload = (await response.json()) as Partial<CatalogPayload>
    if (
      !payload ||
      typeof payload.version !== 'string' ||
      typeof payload.asOf !== 'string' ||
      !Array.isArray(payload.roles) ||
      !Array.isArray(payload.tasks) ||
      !Array.isArray(payload.skills) ||
      payload.roles.length === 0 ||
      payload.tasks.length === 0
    ) {
      return null
    }
    return {
      version: payload.version,
      asOf: payload.asOf,
      roles: payload.roles,
      tasks: payload.tasks,
      skills: payload.skills,
      signals: payload.signals ?? [],
      resources: payload.resources ?? [],
      scenarios: payload.scenarios ?? [],
      sdgs: payload.sdgs ?? [],
      demoPersona: payload.demoPersona ?? null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Apply the live catalogue to the current module instance and return it.
 *
 * Route Handlers and React Server Components are separate module instances, so
 * each needs its own call before touching `lib/data/seed`. The short cache
 * keeps a burst of page/API requests from hitting the backend repeatedly.
 */
export async function getCatalog(maxAgeMs = PAYLOAD_TTL_MS): Promise<CatalogPayload | null> {
  if (isUnitTest) {
    resetCatalog()
    return null
  }
  const freshFor = cached?.payload ? maxAgeMs : MISS_TTL_MS
  if (cached && Date.now() - cached.at < freshFor) {
    if (cached.payload) applyCatalog(cached.payload)
    else resetCatalog()
    return cached.payload
  }
  if (inFlight) return inFlight

  inFlight = fetchCatalog()
    .then((payload) => {
      cached = { payload, at: Date.now() }
      if (payload) applyCatalog(payload)
      else resetCatalog()
      return payload
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}