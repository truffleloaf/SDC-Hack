'use client'

import { SyncNote } from '@/components/account/sync-note'
import { Columns3, LayoutGrid } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { SdgBadge } from '@/components/pivott/badges'
import { PButton } from '@/components/pivott/p-button'
import { PageIntro } from '@/components/pivott/route-stepper'
import { ScenarioSwitch } from '@/components/pivott/scenario-switch'
import { SegmentedControl } from '@/components/pivott/segmented-control'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { RouteCard } from '@/components/routes/route-card'
import { WhySheet } from '@/components/routes/why-sheet'
import { fitLabel } from '@/lib/engine'
import { roleById } from '@/lib/data/seed'
import { setState, useAnalysis, useAppState } from '@/lib/store'
import { cn } from '@/lib/utils'

export default function RoutesPage() {
  const router = useRouter()
  const { state, hydrated } = useAppState()
  const { routes, allRoutes, exposure, scored, assessmentCoverage } = useAnalysis(state)
  const baseline = useAnalysis({ ...state, ignoreTrendSignals: true })
  const [mode, setMode] = useState<'cards' | 'compare'>('cards')
  const [whyId, setWhyId] = useState<string | null>(null)
  const previousOrder = useRef<string[]>([])
  const [moves, setMoves] = useState<Record<string, 'up' | 'down'>>({})
  const orderKey = allRoutes.map((route) => route.roleId).join('|')
  useEffect(() => {
    const order = orderKey ? orderKey.split('|') : []
    const previous = previousOrder.current
    previousOrder.current = order
    if (!previous.length) return
    setMoves(Object.fromEntries(order.flatMap((id, index) => {
      const old = previous.indexOf(id)
      return old >= 0 && old !== index ? [[id, index < old ? 'up' : 'down']] : []
    })))
    const timer = setTimeout(() => setMoves({}), 3000)
    return () => clearTimeout(timer)
  }, [orderKey])


  if (!hydrated) return <PageSkeleton />
  if (!state.roleId || state.selections.length === 0) return <NeedsProfile step="job" />

  const selectedId = routes.some((r) => r.roleId === state.targetRoleId) ? state.targetRoleId : routes[0]?.roleId
  const build = (id: string) => {
    setState({ targetRoleId: id, completedSteps: state.targetRoleId === id ? state.completedSteps : [] })
    router.push('/pathway')
  }
  const whyRoute = routes.find((r) => r.roleId === whyId) ?? null

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow="Routes" title="Compare possible roles.">
          Routes combine skill coverage, overlap with your task skills and target exposure. With unknown ratings, fit is a range and routes rank by its lower bound.
        </PageIntro>
        <div className="flex flex-wrap items-center gap-2">
          <ScenarioSwitch state={state} context="routes" />
          <SegmentedControl
            label="Layout"
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'cards', label: 'Cards', icon: <LayoutGrid className="size-3.5" aria-hidden /> },
              { value: 'compare', label: 'Compare', icon: <Columns3 className="size-3.5" aria-hidden /> },
            ]}
          />
        </div>
      </div>

      <SyncNote eligible={!!state.targetRoleId && state.mode === 'personal'} />
      <p className="mt-5 text-sm text-muted-foreground">You can save up to three routes. <a href="/skills" className="text-primary underline">Edit skill ratings</a></p>
      {assessmentCoverage < 1 && <p className="mt-2 text-sm text-muted-foreground">Current exposure covers assessed reference tasks only ({Math.round(assessmentCoverage * 100)}% of selected time). Custom tasks have no estimate.</p>}
      <section className="card-surface mt-6 p-5" aria-labelledby="trend-effect">
        <h2 id="trend-effect" className="text-lg font-semibold">What changed with trend signals</h2>
        <label className="mt-2 flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={state.ignoreTrendSignals} onChange={e => setState({ignoreTrendSignals:e.target.checked})} />Ignore trend signals</label>
        <p className="text-xs text-muted-foreground">Baseline uses the same ratings and scenario with no signal adjustments.</p>
        <ul className="mt-3 space-y-2 text-sm">{allRoutes.map((route,index) => {
          const old = baseline.allRoutes.findIndex(r => r.roleId===route.roleId)
          const delta=route.score-(baseline.allRoutes[old]?.score ?? route.score)
          return <li key={route.roleId}>{route.title}: rank {old+1} → {index+1} · {delta>=0?'+':''}{delta.toFixed(2)} score points</li>
        })}</ul>
      </section>
      <RouteFan current={roleById[state.roleId]?.title ?? 'Current role'} count={routes.length} />

      <AnimatePresence mode="wait">
        {mode === 'cards' ? (
          <motion.div
            key="cards"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-5 md:grid-cols-3"
          >
            {routes.map((r, i) => (
              <RouteCard
                key={r.roleId}
                route={r}
                rank={i}
                moved={moves[r.roleId]}
                hoursPerWeek={state.hoursPerWeek}
                levels={state.skills}
                saved={state.savedRouteIds.includes(r.roleId)}
                onSave={() => {
                  if (!state.savedRouteIds.includes(r.roleId) && state.savedRouteIds.length >= 3) { toast('Three routes are saved. Remove one before saving another.'); return }
                  setState({ savedRouteIds: state.savedRouteIds.includes(r.roleId) ? state.savedRouteIds.filter((id) => id !== r.roleId) : [...state.savedRouteIds, r.roleId] })
                }}
                currentExposure={scored.length ? exposure : null}
                selected={r.roleId === selectedId}
                onSelect={() => setState({ targetRoleId: r.roleId })}
                onWhy={() => setWhyId(r.roleId)}
                onBuild={() => build(r.roleId)}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div key="compare" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="card-surface relative overflow-x-auto p-2">
              <table className="w-full min-w-[640px] text-sm">
                <caption className="sr-only">Side-by-side comparison of career routes</caption>
                <thead>
                  <tr>
                    <td className="w-40" />
                    {routes.map((r, i) => (
                      <th key={r.roleId} scope="col" className={cn('p-4 text-left align-bottom font-normal', r.roleId === selectedId && 'bg-mint/60 rounded-t-xl')}>
                        {i === 0 && <span className="mb-2 block font-sans text-xs font-medium text-primary">{r.unknownSkillIds.length ? 'First suggested' : 'Closest match'}</span>}
                        <span className="font-serif text-xl">{r.title}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="font-mono text-sm">
                  {[
                    { label: 'Skill match', get: (r: (typeof routes)[number]) => fitLabel(r) },
                    { label: 'Weeks to prepare', get: (r: (typeof routes)[number]) => r.unknownSkillIds.length === roleById[r.roleId].requirements.length ? 'Not estimated' : `${r.unknownSkillIds.length ? 'At least ' : ''}${r.weeks}` },
                    { label: 'Skill gaps', get: (r: (typeof routes)[number]) => r.gaps.length },
                    { label: 'Target exposure', get: (r: (typeof routes)[number]) => `${Math.round(r.targetExposure * 100)}%` },
                    { label: 'Role demand', get: (r: (typeof routes)[number]) => r.demand },
                    { label: 'Route score', get: (r: (typeof routes)[number]) => r.score.toFixed(1) },
                    { label: 'Top gaps', get: (r: (typeof routes)[number]) => <span className="font-sans">{r.gaps.slice(0, 2).map((g) => g.name).join(', ') || '—'}</span> },
                    { label: 'SDGs', get: (r: (typeof routes)[number]) => <span className="flex flex-wrap gap-1">{r.sdgs.map((s) => <SdgBadge key={s} id={s} />)}</span> },
                  ].map((row) => (
                    <tr key={row.label} className="border-t border-border">
                      <th scope="row" className="p-4 text-left font-sans text-xs font-normal text-faint">
                        {row.label}
                      </th>
                      {routes.map((r) => (
                        <td key={r.roleId} className={cn('p-4', r.roleId === selectedId && 'bg-mint/60')}>
                          {row.get(r)}
                        </td>
                      ))}
                    </tr>
                  ))}
                  <tr className="border-t border-border">
                    <td />
                    {routes.map((r) => (
                      <td key={r.roleId} className={cn('p-4 font-sans', r.roleId === selectedId && 'rounded-b-xl bg-mint/60')}>
                        <div className="flex flex-col gap-2">
                          <PButton size="sm" variant={r.roleId === selectedId ? 'primary' : 'secondary'} onClick={() => build(r.roleId)}>
                            Build my plan
                          </PButton>
                          <button type="button" onClick={() => setWhyId(r.roleId)} className="min-h-9 text-sm text-primary underline-offset-4 hover:underline">
                            Why this score?
                          </button>
                        </div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <WhySheet
        route={whyRoute}
        levels={state.skills}
        hoursPerWeek={state.hoursPerWeek}
        open={whyId !== null}
        onOpenChange={(o) => !o && setWhyId(null)}
      />
    </div>
  )
}

function RouteFan({ current, count }: { current: string; count: number }) {
  const xs = Array.from({ length: count }, (_, i) => ((i * 2 + 1) / (count * 2)) * 100)
  return (
    <div className="relative mb-2 mt-10 hidden h-28 md:block" aria-hidden>
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {xs.map((x) => (
          <path
            key={x}
            d={`M50 22 C50 60, ${x} 50, ${x} 100`}
            fill="none"
            stroke="var(--teal)"
            strokeWidth={1.5}
            strokeDasharray="1 6"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
            
          />
        ))}
      </svg>
      <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 shadow-soft">
        <span className="size-2 rounded-full bg-foreground" />
        <span className="text-xs font-medium">{current}</span>
        <span className="font-sans text-xs font-medium text-faint">now</span>
      </div>
    </div>
  )
}
