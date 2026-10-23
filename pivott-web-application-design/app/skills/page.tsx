'use client'

import { ArrowRight } from 'lucide-react'
import { MobileActionBar } from '@/components/pivott/mobile-action-bar'
import { PLink } from '@/components/pivott/p-button'
import { ProgressRing } from '@/components/pivott/progress-ring'
import { PageIntro } from '@/components/pivott/route-stepper'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { SkillCard } from '@/components/skills/skill-card'
import { roleById, skills } from '@/lib/data/seed'
import { setState, taskLookup, useAppState } from '@/lib/store'

export default function SkillsPage() {
  const { state, hydrated } = useAppState()
  if (!hydrated) return <PageSkeleton />
  if (!state.roleId) return <NeedsProfile step="job" />

  const lookup = taskLookup(state)
  const suggested = new Set([
    ...state.resumeSkillIds,
    ...state.selections.flatMap((s) => lookup[s.taskId]?.skills ?? []),
    ...(roleById[state.roleId]?.requirements.map((r) => r.skillId) ?? []),
  ])
  const rated = skills.filter((s) => state.skills[s.id] !== undefined).length

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-32 pt-10 lg:pb-20">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow="Routes · Skill ratings" title="What skills do you bring?">
          Rate what you know today. Rough is fine — you can change it any time.
        </PageIntro>
        <div className="flex items-center gap-4">
          <ProgressRing value={rated / skills.length} size={52} label="Skills rated">
            <span className="font-mono text-xs">{rated}</span>
          </ProgressRing>
          <div className="flex flex-col">
            <span className="text-sm font-medium">
              {rated} of {skills.length} skills rated
            </span>
            <span className="text-xs text-muted-foreground">Unrated skills stay unknown</span>
          </div>
          <PLink href="/routes" className="ml-4 hidden lg:inline-flex">
            Compare possible roles
            <ArrowRight aria-hidden />
          </PLink>
        </div>
      </div>

      <section className="mt-8"><h2 className="text-xl font-semibold">Skills connected to your work</h2>
        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{skills.filter((skill) => suggested.has(skill.id)).map((skill) => <SkillCard key={skill.id} skill={skill} level={state.skills[skill.id]} suggested onChange={(value) => setState((current) => { const next = { ...current.skills }; if (value === undefined) delete next[skill.id]; else next[skill.id] = value; return { skills: next } })} />)}</div>
      </section>
      <details className="mt-8"><summary className="cursor-pointer font-medium">Other skills</summary>
        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{skills.filter((skill) => !suggested.has(skill.id)).map((skill) => <SkillCard key={skill.id} skill={skill} level={state.skills[skill.id]} suggested={false} onChange={(value) => setState((current) => { const next = { ...current.skills }; if (value === undefined) delete next[skill.id]; else next[skill.id] = value; return { skills: next } })} />)}</div>
      </details>

      <div className="mt-12 hidden justify-end lg:flex">
        <PLink href="/routes" size="lg">
          Compare possible roles
          <ArrowRight aria-hidden />
        </PLink>
      </div>

      <MobileActionBar>
        <PLink href="/routes" className="w-full">
          Compare possible roles
          <ArrowRight aria-hidden />
        </PLink>
      </MobileActionBar>
    </div>
  )
}
