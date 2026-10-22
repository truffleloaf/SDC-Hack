import { loadFrontendModules } from './frontend-modules.mjs'
const { seed, engine } = loadFrontendModules()
const tasks = seed.tasksForRole(seed.demoPersona.roleId)
for (const scenarioId of ['normal', 'fast']) {
  const routes = engine.computeRoutes({
    currentRoleId: seed.demoPersona.roleId,
    userTaskSkills: [...new Set(tasks.flatMap((task) => task.skills))],
    levels: seed.demoPersona.skills,
    scenarioId,
    signals: seed.signals,
    hoursPerWeek: 6,
  })
  console.log(scenarioId)
  console.table(routes.map(({ title, score }) => ({ title, score: score.toFixed(5) })))
}
