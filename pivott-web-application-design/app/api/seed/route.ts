import { getCatalog } from '@/lib/catalog'
import { json } from '@/lib/api'
import * as seed from '@/lib/data/seed'

/** Returns the full, versioned seed dataset. POST resets the demo (stateless server; clients clear localStorage). */
export async function GET() {
  const catalog = await getCatalog()
  if (catalog) return json(catalog)
  const { roles, customRole, tasks, skills, signals, resources, scenarios, sdgs, demoPersona, SEED_VERSION, DATA_AS_OF } = seed
  return json({ version: SEED_VERSION, asOf: DATA_AS_OF, roles, customRole, tasks, skills, signals, resources, scenarios, sdgs, demoPersona })
}

export function POST() {
  return json({ reset: true, version: seed.SEED_VERSION, demoPersona: seed.demoPersona })
}
