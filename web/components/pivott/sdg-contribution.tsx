import { roleById, skillById, sdgs } from '@/lib/data/seed'
import mapping from '@/lib/data/sdg-map.json'
export function contribution(roleId:string,skillIds:string[]) {
  return [...new Set([...(roleById[roleId]?.sdgs ?? []),...skillIds.flatMap(id=>skillById[id]?.sdgs ?? [])])].sort((a,b)=>a-b)
}
export function SdgContribution({roleId,skillIds}:{roleId:string;skillIds:string[]}) {
  const reached=contribution(roleId,skillIds)
  return <section className="card-surface mt-8 p-5" aria-labelledby="sdg-contribution"><h2 id="sdg-contribution" className="text-xl font-semibold">Your path contributes to…</h2><p className="mt-2 text-sm">{reached.length} goals mapped across your route and learning skills. Team judgment; this is not a measured impact claim.</p><ul className="mt-4 space-y-3">{reached.map(id=>{const goal=sdgs.find(g=>g.id===id);return <li key={id}><p className="font-medium">{id}. {goal?.name}</p><p className="text-sm text-muted-foreground">{roleById[roleId]?.sdgs.includes(id) ? `${roleById[roleId].title} is mapped to this goal. ` : ''}{[...new Set(skillIds)].filter(k=>skillById[k]?.sdgs.includes(id)).map(k=>`${skillById[k].name}: ${(mapping.skills as Record<string,{reason:string}>)[k]?.reason ?? 'Learning and practice support this goal.'}`).join(' ')}</p></li>})}</ul><a href="/method" className="mt-3 inline-flex min-h-11 items-center text-sm underline">Mapping and limitations</a></section>
}
