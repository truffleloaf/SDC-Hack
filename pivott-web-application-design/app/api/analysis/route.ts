import { allSignals, json, parseProfile } from '@/lib/api'
import { taskById } from '@/lib/data/seed'
import { computeRoutes, confidence, roleExposure, scoreTasks } from '@/lib/engine'

export async function POST(req: Request) {
  const parsed = parseProfile(await req.json().catch(() => null))
  if (!parsed.ok) return json({ error: parsed.error }, 400)
  const p = parsed.value
  const signals = allSignals()
  const tasks = scoreTasks(p.selections, taskById, p.scenario, signals)
  const userTaskSkills = [...new Set(tasks.flatMap((t) => t.skills))]
  return json({
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
