'use client'

import { useId } from 'react'
import type { Skill } from '@/lib/data/seed'

export const levels = ['No experience', 'With guidance', 'Routine work independently', 'Complex work independently', 'Can guide others']
const examples = ['I have not used this skill yet.', 'I can follow a worked example with support.', 'I handle familiar tasks without help.', 'I can handle unfamiliar cases and check the result.', 'I can review work and help someone else learn.']
export function SkillCard({ skill, level, onChange }: { skill: Skill; level: number | undefined; suggested: boolean; onChange: (value: number | undefined) => void }) {
  const id = useId()
  return (
    <div className="flex flex-col gap-3 border-b border-border py-5">
      <h3 className="font-medium">{skill.name}</h3>
      <label htmlFor={id} className="text-sm text-muted-foreground">How independently can you use this skill?</label>
      <p className="text-xs text-muted-foreground">For example: {skill.deliverable}.</p>
      <select id={id} className="pivott-input" value={level === undefined ? 'unknown' : level} onChange={(event) => onChange(event.target.value === 'unknown' ? undefined : Number(event.target.value))}>
        <option value="unknown">Not sure / not rated</option>
        {levels.map((name, index) => <option key={name} value={index}>{index} · {name}</option>)}
      </select>
      <p className="text-xs text-muted-foreground">{level === undefined ? 'Unknown. This skill is excluded from the comparison until rated.' : examples[level]}</p>
    </div>
  )
}
