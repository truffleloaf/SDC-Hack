import { json } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'
import * as seed from '@/lib/data/seed'

/** Returns the full, versioned seed dataset. POST resets the demo (stateless server; clients clear localStorage). */
export async function GET() {
  const catalog = await getCatalog()
  if (catalog) return json(catalog)
  const { roles, tasks, skills, signals, resources, scenarios, sdgs, demoPersona, SEED_VERSION, DATA_AS_OF } = seed
  return json({ version: SEED_VERSION, asOf: DATA_AS_OF, roles, tasks, skills, signals, resources, scenarios, sdgs, demoPersona })
}

export async function POST() {
  await getCatalog()
  // The live catalogue has no demo state to reset; mirror the FastAPI guard.
  if (seed.catalogSource === 'live') return json({ error: 'Demo reset is disabled for the live catalogue' }, 403)
  return json({ reset: true, version: seed.SEED_VERSION, demoPersona: seed.demoPersona })
}
