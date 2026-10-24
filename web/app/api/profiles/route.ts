import { encodeId, json, parseProfile } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'

export async function POST(req: Request) {
  await getCatalog()
  const parsed = parseProfile(await req.json().catch(() => null))
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  return json({ id: encodeId(parsed.value), profile: parsed.value, storage: 'client' }, 201)
}
