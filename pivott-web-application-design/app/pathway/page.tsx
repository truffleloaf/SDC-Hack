'use client'

import { useState } from 'react'
import { SyncNote } from '@/components/account/sync-note'
import { ArrowRight, CalendarPlus } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { toast } from 'sonner'
import { StepCard } from '@/components/pathway/step-card'
import { LogoMark } from '@/components/pivott/logo'
import { MobileActionBar } from '@/components/pivott/mobile-action-bar'
import { PButton, PLink } from '@/components/pivott/p-button'
import { ProgressRing } from '@/components/pivott/progress-ring'
import { PageIntro } from '@/components/pivott/route-stepper'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { ValueSlider } from '@/components/pivott/value-slider'
import { Switch } from '@/components/ui/switch'
import { roleById, skillById } from '@/lib/data/seed'
import { buildPathway } from '@/lib/engine'
import { buildIcs, downloadFile } from '@/lib/ics'
import { setState, taskLookup, useAnalysis, useAppState } from '@/lib/store'

export default function PathwayPage() {
  const { state, hydrated } = useAppState()
  const reduce = useReducedMotion()
  const [ratingOffer, setRatingOffer] = useState<{ skillId: string; from: number; to: number; stepId: string } | null>(null)
  const { routes } = useAnalysis(state)

  if (!hydrated) return <PageSkeleton />
  if (!state.roleId) return <NeedsProfile step="job" />
  const targetId = state.targetRoleId ?? routes[0]?.roleId
  if (!targetId) return <NeedsProfile step="route" />

  const role = roleById[targetId]
  const { steps, totalHours, weeks } = buildPathway({
    targetRoleId: targetId,
    levels: state.skills,
    hoursPerWeek: state.hoursPerWeek,
    freeOnly: state.freeOnly,
  })
  const doneIds = new Set(state.completedSteps.filter((id) => steps.some((s) => s.id === id)))
  const progress = steps.length ? doneIds.size / steps.length : 0
  const unknown = role.requirements.filter((requirement) => state.skills[requirement.skillId] === undefined)
  const complete = unknown.length === 0 && steps.length > 0 && doneIds.size === steps.length

  const fill = steps.length ? doneIds.size / steps.length : 0

  function toggle(id: string) {
    const step = steps.find((item) => item.id === id)
    const wasDone = state.completedSteps.includes(id)
    setState((s) => ({ completedSteps: wasDone ? s.completedSteps.filter((x) => x !== id) : [...s.completedSteps, id] }))
    if (wasDone) { if (ratingOffer?.stepId === id) setRatingOffer(null); return }
    const requirement = role.requirements.find((item) => item.skillId === step?.skillId)
    if (step && requirement && state.skills[step.skillId] !== undefined && state.skills[step.skillId] < requirement.requiredLevel) setRatingOffer({ skillId: step.skillId, from: state.skills[step.skillId], to: requirement.requiredLevel, stepId: id })
  }

  function exportIcs() {
    downloadFile(buildIcs(steps, role.title), `pivott-${role.id}-pathway.ics`, 'text/calendar;charset=utf-8')
    toast.success('Calendar file downloaded', { description: `${steps.length} learning blocks, starting next Monday.` })
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-32 pt-10 lg:pb-20">
      <PageIntro eyebrow="Learning plan" title={`Plan for ${role.title}`}>
        Steps are ordered by how much each skill matters for this role and the size of your rated gap.
      </PageIntro>

      <SyncNote eligible={state.mode === 'personal'} />
      {ratingOffer && <div role="status" className="mt-5 rounded-lg border border-primary p-4 text-sm"><p>Raise your {skillById[ratingOffer.skillId]?.name} rating from {ratingOffer.from} to {ratingOffer.to}?</p><p className="mt-2 text-xs text-muted-foreground">Choose Yes only if you can now work at that level. You can review the level descriptions on Skills.</p><div className="mt-3 flex gap-3"><PButton size="sm" onClick={() => { setState((current) => current.skills[ratingOffer.skillId] === ratingOffer.from ? { skills: { ...current.skills, [ratingOffer.skillId]: ratingOffer.to } } : {}); setRatingOffer(null) }}>Yes</PButton><PButton size="sm" variant="secondary" onClick={() => setRatingOffer(null)}>Not yet</PButton></div></div>}
      {unknown.length > 0 && <div className="mt-5 rounded-lg border border-border bg-card p-4 text-sm"><p>Partial plan: rate {unknown.length} more skills to estimate the remaining learning needs. Unrated skills are not treated as gaps or zero ability.</p><PLink href="/skills" variant="link" className="mt-2">Continue skill ratings</PLink></div>}
      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_340px]">
        <div className="relative">
          <span aria-hidden className="absolute bottom-10 left-5 top-10 border-l-2 border-dotted border-border-strong sm:left-7" />
          <motion.span
            aria-hidden
            className="absolute left-5 top-10 border-l-2 border-dotted border-teal sm:left-7"
            initial={false}
            animate={{ height: `calc(${fill * 100}% - ${fill * 80}px)` }}
            transition={{ duration: reduce ? 0 : 0.45, ease: [0.2, 0.7, 0.2, 1] }}
          />
          <ol className="flex flex-col gap-5" aria-label="Learning steps">
            {steps.map((s) => (
              <StepCard key={s.id} step={s} roleTitle={role.title} taskNames={state.selections.filter((item) => taskLookup(state)[item.taskId]?.skills.includes(s.skillId)).map((item) => state.taskNames[item.taskId] || taskLookup(state)[item.taskId].name)} done={doneIds.has(s.id)} onToggle={() => toggle(s.id)} />
            ))}
            <li className="relative grid grid-cols-[40px_1fr] gap-4 sm:grid-cols-[56px_1fr]">
              <div className="relative z-10 flex justify-center pt-5">
                <span className={`grid size-9 place-items-center rounded-full border-2 bg-background ${complete ? 'border-teal' : 'border-border-strong'}`}>
                  <span className={`size-2.5 rounded-full ${complete ? 'bg-teal' : 'bg-border-strong'}`} />
                </span>
              </div>
              <AnimatePresence mode="wait">
                {complete ? (
                  <motion.div
                    key="done"
                    initial={reduce ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-5 rounded-xl border border-teal/30 bg-mint p-6"
                  >
                    <LogoMark className="size-14 shrink-0 text-foreground" />
                    <div className="flex flex-col gap-1">
                      <p className="font-serif text-2xl">All steps done.</p>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        You’ve marked every learning step complete. Review your skill ratings to update the comparison.
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="todo" className="flex flex-col gap-1 py-5">
                    <p className="font-serif text-xl">{role.title}</p>
                    <p className="text-sm text-muted-foreground">{unknown.length ? `${steps.length - doneIds.size} estimated steps to go · More skills need rating` : steps.length ? `${steps.length - doneIds.size} steps to go` : 'No learning gaps identified from your ratings'}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          </ol>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card-surface flex flex-col gap-6 p-6">
            <div className="flex items-center gap-4">
              <ProgressRing value={progress} size={76} stroke={6} label="Pathway progress">
                <span className="font-mono text-sm">{steps.length ? `${Math.round(progress * 100)}%` : '—'}</span>
              </ProgressRing>
              <div className="flex flex-col">
                <span className="font-serif text-3xl leading-none">
                  {unknown.length && !steps.length ? 'Not estimated' : <>{unknown.length ? '≥ ' : ''}{weeks} <span className="font-sans text-sm text-muted-foreground">weeks</span></>}
                </span>
                <span className="mt-1 font-mono text-xs text-muted-foreground">
                  {unknown.length ? 'Rated gaps only · ' : ''}{totalHours} h · {doneIds.size}/{steps.length} done
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-1 border-t border-border pt-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-medium">Hours per week</span>
                <span className="font-mono text-sm">{state.hoursPerWeek} h</span>
              </div>
              <ValueSlider
                label="Hours per week"
                value={state.hoursPerWeek}
                min={2}
                max={20}
                format={(v) => `${v} h`}
                onChange={(v) => setState({ hoursPerWeek: v })}
              />
              <p className="font-mono text-[11px] text-faint">
                weeks = ceil({totalHours} / {state.hoursPerWeek}) = {weeks}
              </p>
            </div>

            <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 border-t border-border pt-5">
              <span className="flex flex-col">
                <span className="text-sm font-medium">Free resources only</span>
                <span className="text-xs text-muted-foreground">Swap paid courses for free ones</span>
              </span>
              <Switch checked={state.freeOnly} onCheckedChange={(v) => setState({ freeOnly: v })} />
            </label>

            <div className="flex flex-col gap-3 border-t border-border pt-5">
              <PButton variant="secondary" onClick={exportIcs} disabled={!steps.length}>
                <CalendarPlus aria-hidden />
                Add to calendar
              </PButton>
              <PLink href="/passport" className="hidden lg:inline-flex">
                Create my Skill Passport
                <ArrowRight aria-hidden />
              </PLink>
            </div>
          </div>
        </aside>
      </div>

      <MobileActionBar>
        <PLink href="/passport" className="w-full">
          Create my Skill Passport
          <ArrowRight aria-hidden />
        </PLink>
      </MobileActionBar>
    </div>
  )
}
