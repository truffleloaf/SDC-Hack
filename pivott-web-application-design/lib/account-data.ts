import { roleById, skills } from './data/seed'
import { parseCustomInputs } from './custom-inputs'
import { parseStored, type AppState } from './store'
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === 'string')

export function accountProfile(state: AppState): AppState {
  if (state.mode === 'demo') throw new Error('Exit the example before saving your own work.')
  return { ...state, mode: 'personal', recentlyChanged: [] }
}

/** Validate account data before it can replace device state. */
export function readAccountProfile(value: unknown): AppState {
  if (!record(value) || value.version !== 1 || value.mode !== 'personal' || typeof value.name !== 'string' || (value.roleId !== null && (typeof value.roleId !== 'string' || !Object.hasOwn(roleById, value.roleId))) || !Array.isArray(value.selections) || !record(value.skills) || !strings(value.completedSteps) || !strings(value.appliedSignalIds) || (value.scenario !== 'normal' && value.scenario !== 'fast') || typeof value.hoursPerWeek !== 'number' || !Number.isFinite(value.hoursPerWeek) || value.hoursPerWeek < 1 || value.hoursPerWeek > 40) throw new Error('This saved profile cannot be loaded safely.')
  const custom = parseCustomInputs(value)
  if (!custom.ok) throw new Error('This saved profile has invalid custom inputs.')
  for (const selection of value.selections) if (!record(selection) || typeof selection.taskId !== 'string' || typeof selection.share !== 'number' || !Number.isFinite(selection.share) || selection.share < 0 || selection.share > 100) throw new Error('This saved profile has invalid task shares.')
  const ids = new Set(skills.map((skill) => skill.id))
  for (const [id, level] of Object.entries(value.skills)) if (!ids.has(id) || typeof level !== 'number' || !Number.isInteger(level) || level < 0 || level > 4) throw new Error('This saved profile has invalid skill ratings.')
  const result = parseStored(JSON.stringify(value))
  return {
    ...result, resumeSkillIds: strings(value.resumeSkillIds) ? [...new Set(value.resumeSkillIds)].filter((id) => ids.has(id)) : [], customTasks: custom.customTasks, customSignals: custom.customSignals,
    jobTitle: typeof value.jobTitle === 'string' ? value.jobTitle.slice(0, 60) : '',
    careerGoal: typeof value.careerGoal === 'string' ? value.careerGoal.slice(0, 200) : '',
    taskNames: record(value.taskNames) ? Object.fromEntries(Object.entries(value.taskNames).filter((entry): entry is [string, string] => typeof entry[1] === 'string').map(([id, title]) => [id, title.slice(0, 60)])) : {},
    savedRouteIds: strings(value.savedRouteIds) ? value.savedRouteIds.filter((id) => Object.hasOwn(roleById, id)).slice(0, 3) : [],
    targetRoleId: typeof value.targetRoleId === 'string' && Object.hasOwn(roleById, value.targetRoleId) ? value.targetRoleId : null,
    updatedAt: typeof value.updatedAt === 'string' && Number.isFinite(Date.parse(value.updatedAt)) ? value.updatedAt : null,
  }
}

export function readAccountRow(value: unknown) {
  if (!record(value) || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 1 || typeof value.updated_at !== 'string' || !Number.isFinite(Date.parse(value.updated_at))) throw new Error('Invalid saved profile metadata.')
  return { profile: readAccountProfile(value.profile), revision: value.revision, updated_at: value.updated_at }
}
