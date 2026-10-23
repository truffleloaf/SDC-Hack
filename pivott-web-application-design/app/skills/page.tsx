'use client'

import { useState } from 'react'
import { PButton } from '@/components/pivott/p-button'
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
  const [fromTasks, setFromTasks] = useState(false)
  if (!hydrated) return <PageSkeleton />
  if (!state.roleId) return <NeedsProfile step="job" />

  const lookup = taskLookup(state)
  const taskSkills = new Set(state.selections.flatMap((item) => lookup[item.taskId]?.skills ?? []))
  const suggested = fromTasks ? taskSkills : new Set([
    ...state.resumeSkillIds,
    ...state.selections.flatMap((s) => lookup[s.taskId]?.skills ?? []),
    ...(roleById[state.roleId]?.requirements.map((r) => r.skillId) ?? []),
  ])
  const rated = skills.filter((s) => state.skills[s.id] !== undefined).length

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-32 pt-10 lg:pb-20">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow="Routes · Skill ratings" title="Rate your skills">
          Rate the skills you know. Skip any you are unsure about; they stay unknown and are left out of learning gaps.
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

      <div className="mt-6 flex flex-wrap items-center gap-3"><PButton variant="secondary" onClick={() => setFromTasks(!fromTasks)} aria-pressed={fromTasks}>Start from my tasks</PButton><p className="text-sm text-muted-foreground">{fromTasks ? "Showing skills linked to your selected tasks. Choose each level yourself." : "Task and résumé suggestions do not assign a rating."}</p></div>
      <section className="mt-8"><h2 className="text-xl font-semibold">Skills connected to your work</h2>
        <div className="grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">{skills.filter((skill) => suggested.has(skill.id)).map((skill) => <SkillCard key={skill.id} skill={skill} level={state.skills[skill.id]} suggested onChange={(value) => setState((current) => { const next = { ...current.skills }; if (value === undefined) delete next[skill.id]; else next[skill.id] = value; return { skills: next } })} />)}</div>
      </section>
      <details className="mt-8" open={suggested.size === 0 ? true : undefined}><summary className="cursor-pointer font-medium">Other skills</summary>
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
