import liveSeed from './data/live-seed.json'
import {
  applyCatalog,
  resetCatalog,
  type CatalogPayload,
} from './data/seed'

/**
 * Optional external catalogue API.
 *
 * Local development can point this at the root live FastAPI (`:8001`). When it
 * is unset — the Vercel/standalone production case — the committed
 * `live-seed.json` snapshot is used instead, so the deployment needs no
 * environment variables or second service.
 */
export const API_BASE = (
  process.env.PIVOTT_API_BASE ||
  process.env.NEXT_PUBLIC_API_BASE ||
  ''
).replace(/\/+$/, '')

const PAYLOAD_TTL_MS = 30_000
const MISS_TTL_MS = 30_000
// Unit tests must be deterministic and must not depend on a running FastAPI.
const isUnitTest = process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST)

const BUNDLED_LIVE = liveSeed as unknown as CatalogPayload

let cached: { payload: CatalogPayload | null; at: number } | null = null
let inFlight: Promise<CatalogPayload | null> | null = null

function validCatalog(payload: Partial<CatalogPayload> | null | undefined): payload is CatalogPayload {
  return !!payload &&
    typeof payload.version === 'string' &&
    typeof payload.asOf === 'string' &&
    Array.isArray(payload.roles) &&
    Array.isArray(payload.tasks) &&
    Array.isArray(payload.skills) &&
    payload.roles.length > 0 &&
    payload.tasks.length > 0
}

function normalizeCatalog(payload: CatalogPayload): CatalogPayload {
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
}

/**
 * Fetch the live catalogue from `GET /api/seed` when an external API base is
 * configured. Returns null when no base is configured or the response is not a
 * valid catalogue.
 */
export async function fetchCatalog(timeoutMs = 5000): Promise<CatalogPayload | null> {
  if (!API_BASE) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${API_BASE}/api/seed`, {
      cache: 'no-store',
      signal: controller.signal,
    })
    if (!response.ok) return null
    const payload = (await response.json()) as Partial<CatalogPayload>
    return validCatalog(payload) ? normalizeCatalog(payload) : null
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

function applyBundledLive(): CatalogPayload | null {
  if (!validCatalog(BUNDLED_LIVE)) {
    resetCatalog()
    return null
  }
  applyCatalog(BUNDLED_LIVE)
  return BUNDLED_LIVE
}

/**
 * Apply the live catalogue to the current module instance and return it.
 *
 * Route Handlers and React Server Components are separate module instances, so
 * each needs its own call before touching `lib/data/seed`. With no external API
 * configured, the committed live snapshot is applied directly; this is what
 * makes the Vercel deployment work without environment variables.
 */
export async function getCatalog(maxAgeMs = PAYLOAD_TTL_MS): Promise<CatalogPayload | null> {
  if (isUnitTest) {
    resetCatalog()
    return null
  }

  if (!API_BASE) return applyBundledLive()

  const freshFor = cached?.payload ? maxAgeMs : MISS_TTL_MS
  if (cached && Date.now() - cached.at < freshFor) {
    if (cached.payload) applyCatalog(cached.payload)
    else resetCatalog()
    return cached.payload
  }
  if (inFlight) return inFlight

  inFlight = fetchCatalog()
    .then((payload) => {
      if (payload) {
        cached = { payload, at: Date.now() }
        applyCatalog(payload)
        return payload
      }
      // The external API is down: keep the committed snapshot rather than
      // dropping all the way back to the synthetic demo catalogue.
      const fallback = applyBundledLive()
      if (fallback) cached = { payload: fallback, at: Date.now() }
      return fallback
    })
    .finally(() => {
      inFlight = null
    })
  return inFlight
}
