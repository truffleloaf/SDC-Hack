import { allSignals, json, parseProfile } from '@/lib/api'
import { taskById } from '@/lib/data/seed'
import { assessmentSummary, computeRoutes, confidence, roleExposure, scoreTasks } from '@/lib/engine'

export async function POST(req: Request) {
  const parsed = parseProfile(await req.json().catch(() => null))
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  const p = parsed.value
  const signals = allSignals(p.customSignals)
  const lookup = { ...taskById, ...Object.fromEntries((p.customTasks ?? []).map((task) => [task.id, task])) }
  const tasks = scoreTasks(p.selections, lookup, p.scenario, signals)
  const userTaskSkills = [...new Set(p.selections.flatMap((selection) => lookup[selection.taskId]?.skills ?? []))]
  return json({
    ...assessmentSummary(p.selections, lookup),
    scenario: p.scenario,
    roleExposure: roleExposure(tasks),
    confidence: confidence(tasks, signals),
    tasks,
    routes: computeRoutes({
      currentRoleId: p.roleId,
      userTaskSkills,
      levels: p.skills,
      scenarioId: p.scenario,
      signals,
      hoursPerWeek: p.hoursPerWeek,
    }),
    illustrative: true,
  })
}
