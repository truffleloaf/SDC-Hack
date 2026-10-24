import { json } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'
import { catalogSource, DATA_AS_OF, SEED_VERSION, roles, signals, skills, tasks } from '@/lib/data/seed'
import liveMeta from '@/lib/data/live-meta.json'

/** Source details for the committed live snapshot (no backend required). */
export async function GET() {
  await getCatalog()
  const live = catalogSource === 'live'
  const meta = liveMeta as {
    counts?: { postings?: number }
    catalog?: unknown
    demand?: unknown
    model?: unknown
  }
  return json({
    dataset: catalogSource,
    imported: live,
    seedVersion: SEED_VERSION,
    dataAsOf: DATA_AS_OF,
    counts: {
      roles: roles.length,
      tasks: tasks.length,
      skills: skills.length,
      signals: signals.length,
      postings: live ? (meta.counts?.postings ?? 0) : 0,
    },
    catalog: live ? meta.catalog : { name: 'Pivott demo catalogue', license: 'Illustrative demo data' },
    demand: live ? meta.demand : null,
    model: live ? meta.model : null,
  })
}