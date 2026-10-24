import type { Role } from './data/seed'
/** Keep recorded completion when a raised rating removes a gap from the current plan. */
export function planProgress(role: Role | undefined, steps: { id: string }[], completed: string[], levels: Record<string, number>) {
  if (!role) return { doneCount: 0, totalCount: 0, progress: 0, complete: false, unknownCount: 0 }
  const valid = new Set(role.requirements.map((item) => `${role.id}:${item.skillId}`))
  const done = new Set(completed.filter((id) => valid.has(id)))
  const total = new Set([...steps.map((step) => step.id), ...done])
  const unknownCount = role.requirements.filter((item) => levels[item.skillId] === undefined).length
  const complete = unknownCount === 0 && done.size === total.size
  return { doneCount: done.size, totalCount: total.size, progress: total.size ? done.size / total.size : complete ? 1 : 0, complete, unknownCount }
}
