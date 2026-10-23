'use client'

import { useId } from 'react'
import type { Skill } from '@/lib/data/seed'
import { cn } from '@/lib/utils'
export const levels = ['No experience', 'With guidance', 'Routine work independently', 'Complex work independently', 'Can guide others']
const examples = ['I have not used this skill yet.', 'I can follow a worked example with support.', 'I handle familiar tasks without help.', 'I can handle unfamiliar cases and check the result.', 'I can review work and help someone else learn.']
export function SkillCard({ skill, level, onChange }: { skill: Skill; level: number | undefined; suggested: boolean; onChange: (value: number | undefined) => void }) {
  const id = useId()
  return <fieldset className="min-w-0 border-b border-border py-5" aria-describedby={`${id}-example ${id}-help`}>
    <legend className="pt-5 font-medium">{skill.name}</legend>
    <p id={`${id}-example`} className="mt-2 text-xs text-muted-foreground">For example: {skill.deliverable}.</p>
    <div className="mt-4 flex flex-wrap gap-2">{[0, 1, 2, 3, 4, undefined].map((value) => <label key={value ?? 'unknown'} className="relative cursor-pointer">
      <input className="peer sr-only" type="radio" name={id} value={value ?? 'unknown'} checked={level === value} onChange={() => onChange(value)} aria-label={value === undefined ? 'Not sure' : `${value} · ${levels[value]}`} />
      <span className={cn('grid h-11 min-w-11 place-items-center rounded-full border px-3 text-sm peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring', level === value ? 'border-primary bg-mint font-medium text-accent-foreground' : 'border-border-strong bg-card text-muted-foreground')}>{value ?? 'Not sure'}</span>
    </label>)}</div>
    <p id={`${id}-help`} className="mt-3 text-xs leading-relaxed text-muted-foreground">{level === undefined ? 'Unknown. Rate this skill when you can judge your level.' : `${level} · ${levels[level]}. ${examples[level]}`}</p>
  </fieldset>
}
