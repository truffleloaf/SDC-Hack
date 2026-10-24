// Regenerate both Python fixtures from the actual TypeScript seed and engine.
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadFrontendModules } from './frontend-modules.mjs'

const canonicalSdg = readFileSync(fileURLToPath(new URL('../backend/app/data/sdg-map.json',import.meta.url)))
const frontendSdgPath = fileURLToPath(new URL('../pivott-web-application-design/lib/data/sdg-map.json',import.meta.url))
if (process.argv.includes('--check')) {
  if (!readFileSync(frontendSdgPath).equals(canonicalSdg)) throw new Error('Generated SDG mapping is stale')
} else writeFileSync(frontendSdgPath,canonicalSdg)

const { seed, engine } = loadFrontendModules()
const selections = seed.tasksForRole('finance-admin').map((task) => ({ taskId: task.id, share: task.defaultShare }))
function analysis(scenario, profile = {}, previewMultiplier) {
  const signals = [...seed.signals, ...(profile.customSignals ?? [])]
  const lookup = { ...seed.taskById, ...Object.fromEntries((profile.customTasks ?? []).map((task) => [task.id, task])) }
  const tasks = engine.scoreTasks(profile.selections ?? selections, lookup, scenario, signals, previewMultiplier)
  return {
    ...engine.assessmentSummary(profile.selections ?? selections, lookup),
    scenario,
    roleExposure: engine.roleExposure(tasks),
    confidence: engine.confidence(tasks, signals),
    tasks,
    routes: engine.computeRoutes({
      currentRoleId: 'finance-admin', userTaskSkills: [...new Set((profile.selections ?? selections).flatMap((selection) => lookup[selection.taskId].skills))],
      levels: seed.demoPersona.skills, scenarioId: scenario, signals, hoursPerWeek: 8, previewMultiplier,
    }),
  }
}
const normal = analysis('normal')
const pathway = { targetRoleId: 'finance-systems-analyst', levels: seed.demoPersona.skills, hoursPerWeek: 8 }
const data = Object.fromEntries([
  'DATA_AS_OF', 'SEED_VERSION', 'scenarios', 'sdgs', 'skills', 'roles', 'customRole', 'tasks', 'resources', 'signals', 'demoPersona',
].map((key) => [key, seed[key]]))
const customProfile = {
  roleId: 'finance-admin', selections: [...selections, { taskId: 'custom-review', share: 25 }],
  skills: seed.demoPersona.skills, scenario: 'normal', hoursPerWeek: 8, freeOnly: false,
  customTasks: [{ id: 'custom-review', name: 'Review project notes', skills: ['analysis', 'writing'], baseExposure: 0.5, humanJudgment: 0.5 }],
  customSignals: [{ ...seed.signals.find((signal) => signal.evidence === 'verified'), id: 'user-parity', date: seed.DATA_AS_OF, evidence: 'user', strength: 0.6,
    impacts: [{ taskId: 'fa-invoice', impact: 0.15 }, { taskId: 'custom-review', impact: 0.15 }] }],
}
const golden = {
  analysisNormal: normal,
  analysisSlow: analysis('slow'),
  analysisFast: analysis('fast'),
  analysisPreview: analysis('normal', {}, 1.4),
  customProfile,
  analysisCustomNormal: analysis('normal', customProfile),
  analysisCustomFast: analysis('fast', customProfile),
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
