// Regenerate both Python fixtures from the actual TypeScript seed and engine.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadFrontendModules } from './frontend-modules.mjs'

const { seed, engine } = loadFrontendModules()
const selections = seed.tasksForRole('finance-admin').map((task) => ({ taskId: task.id, share: task.defaultShare }))
function analysis(scenario) {
  const tasks = engine.scoreTasks(selections, seed.taskById, scenario, seed.signals)
  return {
    scenario,
    roleExposure: engine.roleExposure(tasks),
    confidence: engine.confidence(tasks, seed.signals),
    tasks,
    routes: engine.computeRoutes({
      currentRoleId: 'finance-admin', userTaskSkills: [...new Set(tasks.flatMap((task) => task.skills))],
      levels: seed.demoPersona.skills, scenarioId: scenario, signals: seed.signals, hoursPerWeek: 8,
    }),
  }
}
const normal = analysis('normal')
const pathway = { targetRoleId: 'finance-systems-analyst', levels: seed.demoPersona.skills, hoursPerWeek: 8 }
const data = Object.fromEntries([
  'DATA_AS_OF', 'SEED_VERSION', 'scenarios', 'sdgs', 'skills', 'roles', 'tasks', 'resources', 'signals', 'demoPersona',
].map((key) => [key, seed[key]]))
const golden = {
  analysisNormal: normal,
  analysisFast: analysis('fast'),
  pathway: engine.buildPathway({ ...pathway, freeOnly: false }),
  pathwayFree: engine.buildPathway({ ...pathway, freeOnly: true }),
  roleTasks: { role: seed.roleById['finance-admin'], scenario: 'normal', roleExposure: normal.roleExposure, tasks: normal.tasks },
}
for (const [name, value] of [['backend/app/data/seed.json', data], ['backend/tests/golden.json', golden]]) {
  const path = fileURLToPath(new URL(`../${name}`, import.meta.url))
  const output = JSON.stringify(value, null, 2) + '\n'
  if (process.argv.includes('--check')) {
    if (readFileSync(path, 'utf8') !== output) throw new Error(`${name} is out of date; run node scripts/generate-data.mjs`)
    console.log(`Current: ${name}`)
  } else {
    writeFileSync(path, output)
    console.log(`Generated: ${name}`)
  }
}
