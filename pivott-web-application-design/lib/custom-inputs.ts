import { DATA_AS_OF, taskById, skills, type Signal } from './data/seed'
import { clamp, type CustomTask } from './engine'

const skillIds = new Set(skills.map((skill) => skill.id))
const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const text = (value: unknown, limit: number) => typeof value === 'string' ? value.trim().slice(0, limit) : ''
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const round2 = (value: number) => Math.round(value * 100) / 100

/** Validates browser-created inputs at the HTTP boundary; never trusts evidence labels. */
export function parseCustomInputs(body: Record<string, unknown>) {
  const customTasks: CustomTask[] = []
  const customSignals: Signal[] = []
  const taskIds = new Set(Object.keys(taskById))
  const signalIds = new Set<string>()
  const fail = (error: string) => ({ ok: false as const, error })

  if (body.customTasks !== undefined && (!Array.isArray(body.customTasks) || body.customTasks.length > 100)) return fail('customTasks must be an array of at most 100 tasks')
  for (const task of (body.customTasks ?? []) as unknown[]) {
    if (!object(task) || typeof task.id !== 'string' || !/^custom-[A-Za-z0-9_-]{1,64}$/.test(task.id) || taskIds.has(task.id)) return fail('Invalid or duplicate custom task id')
    const name = text(task.name, 60)
    if (!name || !Array.isArray(task.skills) || (task.baseExposure !== undefined && !finite(task.baseExposure)) || (task.humanJudgment !== undefined && !finite(task.humanJudgment))) return fail('Invalid custom task')
    customTasks.push({
      id: task.id, name,
      skills: [...new Set(task.skills.filter((id): id is string => typeof id === 'string' && skillIds.has(id)))],
      ...(finite(task.baseExposure) ? { baseExposure: clamp(task.baseExposure, 0, 1) } : {}),
      ...(finite(task.humanJudgment) ? { humanJudgment: clamp(task.humanJudgment, 0, 1) } : {}),
    })
    taskIds.add(task.id)
  }

  if (body.customSignals !== undefined && (!Array.isArray(body.customSignals) || body.customSignals.length > 100)) return fail('customSignals must be an array of at most 100 signals')
  for (const signal of (body.customSignals ?? []) as unknown[]) {
    if (!object(signal) || typeof signal.id !== 'string' || !/^user-[A-Za-z0-9_-]{1,64}$/.test(signal.id) || signalIds.has(signal.id)) return fail('Invalid or duplicate custom signal id')
    const headline = text(signal.headline, 140)
    const sourceName = text(signal.sourceName, 60)
    const sourceUrl = text(signal.sourceUrl, 2048)
    let validUrl = false
    try {
      const url = new URL(sourceUrl)
      validUrl = url.protocol === 'https:' && url.hostname.includes('.') && !url.username && !url.password
    } catch { /* Invalid URLs return a validation error below. */ }
    const date = text(signal.date, 32)
    const parsedDate = new Date(date)
    const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsedDate.getTime()) && parsedDate.toISOString().slice(0, 10) === date && date >= '0001-01-01' && date <= DATA_AS_OF
    if (headline.length < 8 || !sourceName || !validUrl || !validDate || (signal.direction !== 1 && signal.direction !== -1) || !finite(signal.strength) || !Array.isArray(signal.impacts) || !signal.impacts.length || signal.impacts.length > 100) return fail('Invalid custom signal')
    const impacts: Signal['impacts'] = []
    const affected = new Set<string>()
    for (const item of signal.impacts) {
      if (!object(item) || typeof item.taskId !== 'string' || !taskIds.has(item.taskId) || affected.has(item.taskId) || !finite(item.impact)) return fail('Invalid custom signal impact')
      impacts.push({ taskId: item.taskId, impact: round2(clamp(item.impact, 0.05, 0.4)) })
      affected.add(item.taskId)
    }
    customSignals.push({
      id: signal.id, date, headline, sourceName, sourceUrl, direction: signal.direction,
      strength: round2(clamp(signal.strength, 0.1, 1)), impacts,
      explanation: text(signal.explanation, 200) || 'Added manually by an admin.', evidence: 'user',
    })
    signalIds.add(signal.id)
  }
  return { ok: true as const, customTasks, customSignals }
}
