import { json } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'
import { DATA_AS_OF, SEED_VERSION, roles, signals, skills, tasks } from '@/lib/data/seed'

export async function GET() {
  await getCatalog()
  return json({
    status: 'ok',
    seedVersion: SEED_VERSION,
    dataAsOf: DATA_AS_OF,
    counts: { roles: roles.length, tasks: tasks.length, skills: skills.length, signals: signals.length },
  })
}
