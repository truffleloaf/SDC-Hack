import { encodeId, json, parseProfile } from '@/lib/api'
import { buildPathway } from '@/lib/engine'

export async function POST(req: Request) {
  const parsed = parseProfile(await req.json().catch(() => null))
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  const p = parsed.value
  if (!p.targetRoleId) return json({ error: 'targetRoleId is required' }, 400)
  const input = { targetRoleId: p.targetRoleId, levels: p.skills, hoursPerWeek: p.hoursPerWeek, freeOnly: p.freeOnly }
  return json({ id: encodeId(input), ...input, ...buildPathway(input) }, 201)
}
