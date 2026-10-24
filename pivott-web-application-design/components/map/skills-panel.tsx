import { SkillChip } from '@/components/pivott/badges'
import { skillById } from '@/lib/data/seed'
import type { RouteResult, ScoredTask } from '@/lib/engine'

export function deriveSkillGroups(tasks: ScoredTask[], levels: Record<string, number>, topRoute?: RouteResult) {
  const acc = new Map<string, { w: number; e: number }>()
  for (const t of tasks) {
    for (const s of t.skills) {
      const cur = acc.get(s) ?? { w: 0, e: 0 }
      cur.w += t.share
      cur.e += t.share * t.exposure
      acc.set(s, cur)
    }
  }
  const stays = [...acc.entries()]
    .map(([id, v]) => ({ id, exposure: v.e / v.w }))
    .filter((s) => s.exposure < 0.55 && (levels[s.id] ?? 0) >= 2)
    .sort((a, b) => a.exposure - b.exposure)
    .map((s) => s.id)
  const reinforce = (topRoute?.gaps ?? []).slice(0, 4).map((g) => g.skillId)
  return { stays, reinforce }
}

export function SkillsPanel({ stays, reinforce }: { stays: string[]; reinforce: string[] }) {
  return (
    <div className="flex flex-col gap-7">
      <section aria-labelledby="stay-title" className="flex flex-col gap-3">
        <h3 id="stay-title" className="font-serif text-xl">
          Skills in lower-exposure tasks
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">Strengths tied to your lower-exposure work.</p>
        <div className="flex flex-wrap gap-1.5">
          {stays.length ? (
            stays.map((s) => <SkillChip key={s} skillId={s} tone="teal" />)
          ) : (
            <span className="text-sm text-muted-foreground">Rate more skills to identify these overlaps.</span>
          )}
        </div>
      </section>

      <section aria-labelledby="reinforce-title" className="flex flex-col gap-3">
        <h3 id="reinforce-title" className="font-serif text-xl">
          Skills worth reinforcing
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">Highest-priority gaps for your closest route.</p>
        <div className="flex flex-wrap gap-1.5">
          {reinforce.length ? (
            reinforce.map((s) => <SkillChip key={s} label={skillById[s]?.name} tone="peach" />)
          ) : (
            <span className="text-sm text-muted-foreground">No rated gaps identified. Unknown skills still need a rating.</span>
          )}
        </div>
      </section>

      <section aria-labelledby="legend-title" className="flex flex-col gap-3 border-t border-border pt-6">
        <h3 id="legend-title" className="font-sans text-xs font-medium text-muted-foreground">
          Exposure legend
        </h3>
        <ul className="flex flex-col gap-2.5 text-sm">
          <li className="flex items-center gap-3">
            <span className="size-3.5 rounded-full bg-exp-low" aria-hidden />
            Lower <span className="ml-auto font-mono text-xs text-faint">{'< 45%'}</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="size-3.5 rounded-full bg-exp-mid" aria-hidden />
            Medium <span className="ml-auto font-mono text-xs text-faint">45–64%</span>
          </li>
          <li className="flex items-center gap-3">
            <span className="size-3.5 rounded-full bg-exp-high" aria-hidden />
            Higher <span className="ml-auto font-mono text-xs text-faint">{'≥ 65%'}</span>
          </li>
        </ul>
        <dl className="mt-2 space-y-3 text-xs leading-relaxed text-muted-foreground">
          <div><dt className="text-foreground">Automate</dt><dd>Exposure ≥ 65% and judgment {'<'} 40%</dd></div>
          <div><dt className="text-foreground">Augment</dt><dd>AI assists and you decide</dd></div>
          <div><dt className="text-foreground">Protect</dt><dd>Human judgment ≥ 65%</dd></div>
        </dl>
      </section>
    </div>
  )
}
