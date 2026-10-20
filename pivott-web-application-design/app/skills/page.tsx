'use client'

import { ArrowRight } from 'lucide-react'
import { MobileActionBar } from '@/components/pivott/mobile-action-bar'
import { PLink } from '@/components/pivott/p-button'
import { ProgressRing } from '@/components/pivott/progress-ring'
import { PageIntro } from '@/components/pivott/route-stepper'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { SkillCard } from '@/components/skills/skill-card'
import { roleById, skills, type SkillCategory } from '@/lib/data/seed'
import { setState, taskLookup, useAppState } from '@/lib/store'

const categories: SkillCategory[] = ['Technical', 'Analytical', 'Communication', 'Operational']

export default function SkillsPage() {
  const { state, hydrated } = useAppState()
  if (!hydrated) return <PageSkeleton />
  if (!state.roleId) return <NeedsProfile step="job" />

  const lookup = taskLookup(state)
  const suggested = new Set([
    ...state.selections.flatMap((s) => lookup[s.taskId]?.skills ?? []),
    ...(roleById[state.roleId]?.requirements.map((r) => r.skillId) ?? []),
  ])
  const rated = skills.filter((s) => state.skills[s.id] !== undefined).length

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-32 pt-10 lg:pb-20">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow="Step 2 · Your skills" title="What skills do you bring?">
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
            <span className="text-xs text-muted-foreground">Unrated skills count as 0</span>
          </div>
          <PLink href="/map" className="ml-4 hidden lg:inline-flex">
            Reveal my map
            <ArrowRight aria-hidden />
          </PLink>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-12">
        {categories.map((cat) => (
          <section key={cat} aria-labelledby={`cat-${cat}`} className="flex flex-col gap-4">
            <h2 id={`cat-${cat}`} className="flex items-center gap-3 font-serif text-2xl">
              {cat}
              <span aria-hidden className="h-px flex-1 border-t border-dotted border-border-strong" />
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {skills
                .filter((s) => s.category === cat)
                .map((s) => (
                  <SkillCard
                    key={s.id}
                    skill={s}
                    level={state.skills[s.id]}
                    suggested={suggested.has(s.id)}
                    onChange={(v) => setState((st) => ({ skills: { ...st.skills, [s.id]: v } }))}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      <div className="mt-12 hidden justify-end lg:flex">
        <PLink href="/map" size="lg">
          Reveal my map
          <ArrowRight aria-hidden />
        </PLink>
      </div>

      <MobileActionBar>
        <PLink href="/map" className="w-full">
          Reveal my map
          <ArrowRight aria-hidden />
        </PLink>
      </MobileActionBar>
    </div>
  )
}
