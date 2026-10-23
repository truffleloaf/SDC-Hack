'use client'

import { motion, useReducedMotion } from 'motion/react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { roleById, skillById } from '@/lib/data/seed'

export function SkillBridge({ roleId, levels }: { roleId: string; levels: Record<string, number> }) {
  const reduce = useReducedMotion()
  const requirements = [...roleById[roleId].requirements].sort((a, b) => b.importance - a.importance).slice(0, 3)
  return <section aria-label="Skill levels compared"><h3 className="text-sm font-medium">Required skills</h3><div className="mt-2 space-y-3">{requirements.map((requirement) => {
    const skill = skillById[requirement.skillId], current = levels[requirement.skillId]
    const gap = current === undefined ? undefined : Math.max(0, requirement.requiredLevel - current)
    return <Tooltip key={skill.id}><TooltipTrigger className="block min-h-11 w-full rounded-md text-left" aria-label={`${skill.name}. Your level ${current ?? 'unknown'}; required ${requirement.requiredLevel}.`}>
      <span className="block text-xs">{skill.name}</span>
      <span className="mt-1 grid grid-cols-[70px_1fr] items-center gap-2 text-[11px] text-muted-foreground"><span>You: {current ?? 'unknown'}</span><span className="h-1.5 overflow-hidden rounded-md bg-subtle">{current === undefined ? <span className="block h-full" style={{ backgroundImage: 'repeating-linear-gradient(135deg, var(--border-strong) 0 2px, transparent 2px 6px)' }} /> : <motion.span className="block h-full origin-left bg-primary" style={{ width: `${current / 4 * 100}%` }} initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reduce ? 0 : 0.4 }} />}</span></span>
      <span className="mt-1 grid grid-cols-[70px_1fr] items-center gap-2 text-[11px] text-muted-foreground"><span>Required: {requirement.requiredLevel}</span><span className="h-1.5 overflow-hidden rounded-md bg-subtle"><motion.span className="block h-full origin-left bg-border-strong" style={{ width: `${requirement.requiredLevel / 4 * 100}%` }} initial={reduce ? false : { scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: reduce ? 0 : 0.4 }} /></span></span>
    </TooltipTrigger><TooltipContent>{gap === undefined ? 'Rate this skill to estimate the gap.' : `Gap: ${gap} levels · about ${gap * skill.hoursPerLevel} h`}</TooltipContent></Tooltip>
  })}</div></section>
}
