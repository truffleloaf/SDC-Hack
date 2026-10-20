import { json } from '@/lib/api'
import { roles, sdgs } from '@/lib/data/seed'

export function GET() {
  return json({
    sdgs: sdgs.map((s) => ({ ...s, roles: roles.filter((r) => r.sdgs.includes(s.id)).map((r) => r.id) })),
  })
}
