import { decodeId, json, parseProfile } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'
import { buildPathway } from '@/lib/engine'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await getCatalog()
  const { id } = await params
  const raw = decodeId(id) as Record<string, unknown> | null
  if (!raw) return json({ error: 'Pathway not found' }, 404)
  const parsed = parseProfile({ ...raw, roleId: raw.targetRoleId, skills: raw.levels })
  if (!parsed.ok || !parsed.value.targetRoleId) return json({ error: 'Pathway not found' }, 404)
  const p = parsed.value
  const input = { targetRoleId: p.targetRoleId!, levels: p.skills, hoursPerWeek: p.hoursPerWeek, freeOnly: p.freeOnly }
  return json({ id, ...input, ...buildPathway(input) })
}
