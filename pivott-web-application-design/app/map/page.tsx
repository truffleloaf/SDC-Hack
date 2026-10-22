'use client'

import { ArrowRight, Info, Layers, List, Map as MapIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { SkillsPanel, deriveSkillGroups } from '@/components/map/skills-panel'
import { TaskListTable } from '@/components/map/task-list-table'
import { TaskMapCanvas } from '@/components/map/task-map-canvas'
import { DemoLabel } from '@/components/pivott/badges'
import { MobileActionBar } from '@/components/pivott/mobile-action-bar'
import { PButton, PLink } from '@/components/pivott/p-button'
import { CountUp } from '@/components/pivott/progress-ring'
import { ScenarioSwitch } from '@/components/pivott/scenario-switch'
import { SegmentedControl } from '@/components/pivott/segmented-control'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { roleById } from '@/lib/data/seed'
import { confidence } from '@/lib/engine'
import { displayName, possessive, setState, useAnalysis, useAppState } from '@/lib/store'

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
  const { scored, exposure, routes, lastUpdated, signals } = analysis
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
            Step 3 · {possessive(displayName(state))} task map · {role?.title}
          </p>
          <h1 id="summary-title" className="flex items-baseline gap-3 font-serif tracking-[-0.03em]">
            <CountUp value={exposure * 100} format={(n) => `${Math.round(n)}%`} className="text-7xl leading-none md:text-8xl" />
            <span className="text-2xl text-muted-foreground md:text-3xl">task exposure</span>
          </h1>
          <DemoLabel className="w-fit" />
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
                    Based on how much of your time is covered by signals and how many come from published sources.
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
            The share of your working time spent on tasks AI could potentially handle. It is not a probability of losing your job.
          </p>
        </div>
      </section>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_300px]">
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
        </section>

        <aside className="hidden lg:block">
          <div className="card-surface sticky top-24 flex flex-col gap-8 p-6">
            <SkillsPanel stays={stays} reinforce={reinforce} />
            <PLink href="/routes" className="w-full">
              Show my routes
              <ArrowRight aria-hidden />
            </PLink>
          </div>
        </aside>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-[24px] px-5 pb-8">
          <SheetHeader className="px-0">
            <SheetTitle className="font-serif text-2xl font-normal">Your skills on this map</SheetTitle>
          </SheetHeader>
          <SkillsPanel stays={stays} reinforce={reinforce} />
        </SheetContent>
      </Sheet>

      <MobileActionBar>
        <PLink href="/routes" className="w-full">
          Show my routes
          <ArrowRight aria-hidden />
        </PLink>
      </MobileActionBar>
    </div>
  )
}
