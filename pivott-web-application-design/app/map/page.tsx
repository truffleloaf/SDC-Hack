'use client'

import { ArrowRight, Info, Layers, List, Map as MapIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { VerifyAnalysis } from '@/components/map/verify-analysis'
import { SkillsPanel, deriveSkillGroups } from '@/components/map/skills-panel'
import { TaskListTable } from '@/components/map/task-list-table'
import { TaskMapCanvas } from '@/components/map/task-map-canvas'
import { MobileActionBar } from '@/components/pivott/mobile-action-bar'
import { PButton, PLink } from '@/components/pivott/p-button'
import { ScenarioSwitch } from '@/components/pivott/scenario-switch'
import { SegmentedControl } from '@/components/pivott/segmented-control'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { roleById } from '@/lib/data/seed'
import { confidence } from '@/lib/engine'
import { setState, useAnalysis, useAppState } from '@/lib/store'

const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

export default function MapPage() {
  const { state, hydrated } = useAppState()
  const analysis = useAnalysis(state)
  const [view, setView] = useState<'map' | 'list'>('map')
  const [sheetOpen, setSheetOpen] = useState(false)

  const changedIds = state.recentlyChanged.map((c) => c.taskId)
  useEffect(() => {
    if (!changedIds.length) return
    const t = setTimeout(() => setState({ recentlyChanged: [] }), 7000)
    return () => clearTimeout(t)
  }, [changedIds.length])

  if (!hydrated) return <PageSkeleton />
  if (!state.roleId || state.selections.length === 0) return <NeedsProfile step="job" />

  const role = roleById[state.roleId]
  const { scored, exposure, routes, lastUpdated, signals, unassessed, assessmentCoverage } = analysis
  const conf = confidence(scored, signals)
  const { stays, reinforce } = deriveSkillGroups(scored, state.skills, routes[0])
  const counts = {
    Automate: scored.filter((t) => t.classification === 'Automate').length,
    Augment: scored.filter((t) => t.classification === 'Augment').length,
    Protect: scored.filter((t) => t.classification === 'Protect').length,
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-32 pt-10 lg:pb-20">
      <section aria-labelledby="summary-title" className="grid gap-8 md:grid-cols-[auto_1fr] md:items-end md:gap-14">
        <div className="flex flex-col gap-2">
          <p className="font-sans text-sm font-medium text-primary">
            {Object.keys(state.skills).length ? 'Work' : 'Your initial map · Step 3 of 3'} · {state.jobTitle || role?.title}
          </p>
          <h1 id="summary-title" className="flex items-baseline gap-3 font-serif tracking-[-0.03em]">
            <span className="shrink-0 whitespace-nowrap text-5xl font-semibold leading-none md:text-6xl">{scored.length ? `${Math.round(exposure * 100)}%` : 'Not assessed'}</span>
            <span className="text-2xl text-muted-foreground md:text-3xl">estimated task exposure</span>
          </h1>
        </div>

        <div className="flex flex-col gap-4 md:pb-2">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex flex-col gap-1">
              <dt className="font-sans text-xs font-medium text-faint">Confidence</dt>
              <dd className="flex items-center gap-1.5 text-sm font-medium">
                {conf}
                <Tooltip>
                  <TooltipTrigger className="grid size-6 place-items-center rounded-full text-faint hover:text-foreground" aria-label="About confidence">
                    <Info className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-60">
                    {signals.filter((s) => s.evidence === 'verified' && s.impacts.some((i) => scored.some((t) => t.id === i.taskId))).length} published sources reference your tasks. The label combines time coverage with their share of the adjustment weight; assumptions do not count as published sources.
                  </TooltipContent>
                </Tooltip>
              </dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-sans text-xs font-medium text-faint">Last updated</dt>
              <dd className="font-mono text-sm">{fmtDate(lastUpdated)}</dd>
            </div>
            <div className="flex flex-col gap-1">
              <dt className="font-sans text-xs font-medium text-faint">Tasks</dt>
              <dd className="text-sm">
                {counts.Automate} automate · {counts.Augment} augment · {counts.Protect} protect
              </dd>
            </div>
          </dl>
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground text-pretty">
            Exposure estimates how much of a task AI could handle. It does not predict job loss. Scores use sample data, <a href="/method" className="text-primary underline">see how scores work</a>.
          </p>
        </div>
      </section>

      <p className="mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground">{scored.length > 0 && `The largest contributions come from ${[...scored].sort((a, b) => b.share * b.exposure - a.share * a.exposure).slice(0, 2).map((task) => task.name.toLowerCase()).join(' and ')}.`} {unassessed.length > 0 && `Only ${Math.round(assessmentCoverage * 100)}% of your selected time is assessed. The percentage above describes assessed tasks only.`}</p>
      <div className="mt-5 flex flex-wrap gap-3"><PLink href="/start" variant="secondary" size="sm">Edit tasks</PLink><PLink href="/skills" variant="secondary" size="sm">Rate skills for routes</PLink></div>
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section aria-label="Task visualisation" className="card-surface flex flex-col gap-5 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <ScenarioSwitch state={state} />
            <div className="flex items-center gap-2">
              <PButton variant="secondary" size="sm" className="lg:hidden" onClick={() => setSheetOpen(true)}>
                <Layers aria-hidden />
                Skills
              </PButton>
              <SegmentedControl
                label="View"
                size="sm"
                value={view}
                onChange={setView}
                options={[
                  { value: 'map', label: 'Map', icon: <MapIcon className="size-3.5" aria-hidden /> },
                  { value: 'list', label: 'List', icon: <List className="size-3.5" aria-hidden /> },
                ]}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">Bubble size shows time spent within assessed tasks. Color shows estimated AI exposure.</p>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
            >
              {view === 'map' ? (
                <TaskMapCanvas tasks={scored} highlightIds={changedIds} />
              ) : (
                <TaskListTable tasks={scored} highlightIds={changedIds} />
              )}
            </motion.div>
          </AnimatePresence>
          {unassessed.length > 0 && <section className="border-t border-border pt-4"><h2 className="text-sm font-medium">Not assessed yet</h2><ul className="mt-2 space-y-2">{unassessed.map((task) => <li key={task.taskId} className="flex justify-between gap-3 text-sm"><span>{state.taskNames[task.taskId] || task.name}</span><span className="text-muted-foreground">{Math.round(task.share)}% of your time · No estimate</span></li>)}</ul></section>}
          <VerifyAnalysis state={state} />
        </section>

        <aside className="hidden lg:block">
          <div className="card-surface sticky top-24 flex flex-col gap-8 p-6">
            <SkillsPanel stays={stays} reinforce={reinforce} />
            <PLink href={Object.keys(state.skills).length ? "/routes" : "/skills"} className="w-full">
              {Object.keys(state.skills).length ? "Show my routes" : "Personalize routes"}
              <ArrowRight aria-hidden />
            </PLink>
          </div>
        </aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl px-5 pb-8">
          <SheetHeader className="px-0">
            <SheetTitle className="font-serif text-2xl font-normal">Your skills on this map</SheetTitle>
          </SheetHeader>
          <SkillsPanel stays={stays} reinforce={reinforce} />
        </SheetContent>
      </Sheet>

      <MobileActionBar>
        <PLink href={Object.keys(state.skills).length ? "/routes" : "/skills"} className="w-full">
          {Object.keys(state.skills).length ? "Show my routes" : "Personalize routes"}
          <ArrowRight aria-hidden />
        </PLink>
      </MobileActionBar>
    </div>
  )
}
