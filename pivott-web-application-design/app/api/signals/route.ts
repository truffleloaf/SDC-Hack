import { allSignals, json } from '@/lib/api'
import { getCatalog } from '@/lib/catalog'
import { DATA_AS_OF } from '@/lib/data/seed'
import { ageDays, recency } from '@/lib/engine'

export async function GET() {
  await getCatalog()
  const signals = allSignals()
    .map((s) => ({ ...s, recency: s.evidence === 'assumption' ? null : recency(ageDays(s.date)) }))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
  return json({ asOf: DATA_AS_OF, count: signals.length, signals })
}
