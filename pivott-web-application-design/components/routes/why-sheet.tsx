'use client'

import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { roleById, skillById } from '@/lib/data/seed'
import type { RouteResult } from '@/lib/engine'

const f2 = (n: number) => n.toFixed(2)

function Formula({ children }: { children: React.ReactNode }) {
  return <pre className="overflow-x-auto whitespace-pre-wrap rounded-xl bg-subtle p-3 font-mono text-xs leading-relaxed text-foreground">{children}</pre>
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b border-border pb-6 last:border-b-0">
      <h3 className="font-serif text-xl">{title}</h3>
      {children}
    </section>
  )
}

export function WhySheet({
  route,
  levels,
  hoursPerWeek,
  open,
  onOpenChange,
}: {
  route: RouteResult | null
  levels: Record<string, number>
  hoursPerWeek: number
  open: boolean
  onOpenChange: (o: boolean) => void
}) {
  const role = route ? roleById[route.roleId] : null
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto p-0 sm:max-w-lg">
        {route && role && (
          <>
            <SheetHeader className="border-b border-border p-6">
              <p className="font-sans text-xs font-medium text-primary">Why this score?</p>
              <SheetTitle className="font-serif text-3xl font-normal">{route.title}</SheetTitle>
              <SheetDescription>Every number below is deterministic and reproducible from the stored data.</SheetDescription>
            </SheetHeader>
            <div className="flex flex-col gap-6 p-6">
              <Block title="Skill coverage">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left font-sans text-xs font-medium text-faint">
                        <th scope="col" className="py-2 font-normal">Skill</th>
                        <th scope="col" className="py-2 text-right font-normal">You</th>
                        <th scope="col" className="py-2 text-right font-normal">Need</th>
                        <th scope="col" className="py-2 text-right font-normal">Weight</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-xs">
                      {role.requirements.map((r) => (
                        <tr key={r.skillId} className="border-t border-border">
                          <th scope="row" className="py-2 text-left font-sans text-sm font-normal">{skillById[r.skillId]?.name}</th>
                          <td className="py-2 text-right">{levels[r.skillId] ?? 0}</td>
                          <td className="py-2 text-right">{r.requiredLevel}</td>
                          <td className="py-2 text-right">{r.importance}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <Formula>{`skill_coverage = Σ(importance × min(current / required, 1)) / Σ importance\n             = ${f2(route.coverage)}`}</Formula>
              </Block>

              <Block title="Task similarity">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Overlap between the skills your tasks use and the skills used in {route.title} tasks (Jaccard index).
                </p>
                <Formula>{`task_similarity = |shared skills| / |all skills|\n                = ${route.similarity === null ? 'unavailable → fit falls back to coverage' : f2(route.similarity)}`}</Formula>
              </Block>

              <Block title="Skill match">
                <Formula>
                  {route.similarity === null
                    ? `fit = 100 × skill_coverage = ${route.fit.toFixed(1)}`
                    : `fit = 100 × (0.8 × ${f2(route.coverage)} + 0.2 × ${f2(route.similarity)})\n    = ${route.fit.toFixed(1)}`}
                </Formula>
              </Block>

              <Block title="Gap priority">
                <ul className="flex flex-col gap-2 text-sm">
                  {route.gaps.map((g) => (
                    <li key={g.skillId} className="flex items-center justify-between gap-3">
                      <span>{g.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {g.gap} × {g.importance} × {role.demand / 100} = {f2(g.priority)}
                      </span>
                    </li>
                  ))}
                </ul>
                <Formula>{`gap = max(0, required − current)\ngap_priority = gap × importance × (role_demand / 100)`}</Formula>
              </Block>

              <Block title="Estimated learning duration">
                <Formula>{`weeks = ceil(Σ gap_hours / hours_per_week)\n      = ceil(${route.totalGapHours} / ${hoursPerWeek}) = ${route.weeks}`}</Formula>
              </Block>

              <Block title="Ranking">
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Routes favour strong skill match and lower task exposure in the target role, recalculated per scenario.
                </p>
                <Formula>{`route_score = 0.7 × fit + 0.3 × 100 × (1 − target_exposure)\n            = 0.7 × ${route.fit.toFixed(1)} + 30 × (1 − ${f2(route.targetExposure)})\n            = ${route.score.toFixed(2)}`}</Formula>
              </Block>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
