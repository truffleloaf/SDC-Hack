import { forwardRef } from 'react'
import { LogoMark } from '@/components/pivott/logo'
import { SkillChip } from '@/components/pivott/badges'
import type { PathwayStep } from '@/lib/engine'

export interface PassportData {
  name: string
  currentRole: string
  destination: string
  destinationFamily: string
  ratedSkillCount?: number
  unknownSkillCount?: number
  match: number
  matchHigh: number
  weeks: number
  skills: string[]
  steps: PathwayStep[]
  completed: Set<string>
  date: string
  code: string
}

export const PassportCard = forwardRef<HTMLDivElement, { data: PassportData }>(function PassportCard({ data }, ref) {
  const stubSteps = data.steps.slice(0, 4)
  return (
    <div
      ref={ref}
      className="light-scope relative overflow-hidden rounded-xl p-3 sm:p-4"
      style={{ background: 'var(--subtle)' }}
    >
      <div className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-card md:flex-row">
        <div className="flex flex-1 flex-col gap-8 p-6 sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-faint">Skill Passport</span>
              <span className="font-serif text-2xl leading-tight">{data.name || 'Your name'}</span>
              <span className="text-sm text-muted-foreground">{data.currentRole}</span>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span className="size-3 shrink-0 rounded-full bg-foreground" />
              <span className="h-0 flex-1 border-t-2 border-dotted border-teal" />
              <span className="grid size-5 shrink-0 place-items-center rounded-full border-2 border-teal">
                <span className="size-2 rounded-full bg-teal" />
              </span>
            </div>
            <div className="flex items-end justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="font-sans text-xs font-medium text-faint">Destination</span>
                <span className="font-serif text-3xl leading-[1.05] tracking-[-0.02em] sm:text-4xl">{data.destination}</span>
                <span className="text-sm text-muted-foreground">{data.destinationFamily}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 sm:grid-cols-[auto_auto_1fr]">
            <div className="flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-faint">Skill match</span>
              <span className="font-serif text-4xl leading-none tracking-[-0.03em]">
                {Math.round(data.match)}{data.unknownSkillCount ? `–${Math.round(data.matchHigh)}` : ''}
                <span className="text-2xl text-muted-foreground">%</span>
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="font-sans text-xs font-medium text-faint">Est. route</span>
              <span className="font-serif text-4xl leading-none tracking-[-0.03em]">
                {data.ratedSkillCount === 0 ? '—' : `${data.unknownSkillCount ? '≥ ' : ''}${data.weeks}`}
                {data.ratedSkillCount !== 0 && <span className="text-2xl text-muted-foreground"> wks</span>}
              </span>
            </div>
            <div className="col-span-2 flex flex-col gap-2 sm:col-span-1">
              <span className="font-sans text-xs font-medium text-faint">Durable skills</span>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.slice(0, 5).map((s) => (
                  <SkillChip key={s} skillId={s} tone="teal" />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
            <span className="flex items-center gap-1.5 text-foreground">
              <LogoMark className="size-5" title="" />
              <span className="font-serif text-lg leading-none tracking-[-0.02em]">Pivott</span>
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">Updated {data.date}</span>
          </div>
        </div>

        <div className="relative flex flex-col gap-5 border-t-2 border-dashed border-border-strong bg-subtle p-6 sm:p-8 md:w-72 md:border-l-2 md:border-t-0">
          <span aria-hidden className="absolute -left-3 -top-3 hidden size-6 rounded-full md:block" style={{ background: '#E9F5F6' }} />
          <span aria-hidden className="absolute -bottom-3 -left-3 hidden size-6 rounded-full md:block" style={{ background: '#EAF3FC' }} />
          <span className="font-sans text-xs font-medium text-faint">Route stops</span>
          <ol className="relative flex flex-col gap-4">
            <span aria-hidden className="absolute bottom-2 left-[5px] top-2 border-l-2 border-dotted border-teal/60" />
            {stubSteps.map((s) => {
              const done = data.completed.has(s.id)
              return (
                <li key={s.id} className="relative flex gap-3">
                  <span className={`relative z-10 mt-1 size-3 shrink-0 rounded-full border-2 ${done ? 'border-teal bg-teal' : 'border-teal bg-card'}`} />
                  <span className="flex flex-col">
                    <span className="text-sm font-medium leading-snug">{s.title.replace(/^(Start|Level up): /, '')}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      Wk {s.startWeek}
                      {s.endWeek !== s.startWeek ? `–${s.endWeek}` : ''} · {s.hours} h
                    </span>
                  </span>
                </li>
              )
            })}
            {stubSteps.length === 0 && <li className="text-sm text-muted-foreground">{data.unknownSkillCount ? 'Rate the remaining skills to estimate learning needs.' : 'No gaps identified from your ratings.'}</li>}
          </ol>
          <a href="/method" className="mt-auto min-h-11 text-xs text-muted-foreground underline">How scores work · pivottstudio.vercel.app/method</a>
        </div>
      </div>
    </div>
  )
})
