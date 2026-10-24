import { demoPersona, roleById, signals, tasksForRole } from './data/seed'
import { computeRoutes, type ScenarioId } from './engine'

export const DEMO_SCENARIO: ScenarioId = 'normal'
export const DEMO_HOURS_PER_WEEK = 6

/** Shared inputs for the landing illustration and the default demo workflow. */
export function getDemoJourney(scenarioId: ScenarioId = DEMO_SCENARIO) {
  const tasks = tasksForRole(demoPersona.roleId)
  const routes = computeRoutes({
    currentRoleId: demoPersona.roleId,
    userTaskSkills: [...new Set(tasks.flatMap((task) => task.skills))],
    levels: demoPersona.skills,
    scenarioId,
    signals,
    hoursPerWeek: DEMO_HOURS_PER_WEEK,
  })
  return { source: roleById[demoPersona.roleId], destination: routes[0], routes }
}
