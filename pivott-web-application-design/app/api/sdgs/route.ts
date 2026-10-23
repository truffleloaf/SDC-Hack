import { json } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'
import { roles, sdgs } from '@/lib/data/seed'

export async function GET() {
  await getCatalog()
  return json({
    sdgs: sdgs.map((s) => ({ ...s, roles: roles.filter((r) => r.sdgs.includes(s.id)).map((r) => r.id) })),
  })
}
