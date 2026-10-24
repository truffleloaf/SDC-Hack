import type { ScenarioId } from './engine'
import { analyze, type AppState } from './store'

export interface RemoteAnalysis {
  scenario: ScenarioId
  roleExposure: number
  tasks: { id: string; exposure: number }[]
  routes: { roleId: string }[]
}

/** No display name, browser identifiers, completion history or unapplied signals leave the browser. */
export function analysisRequest(state: AppState) {
  return {
    sdgFocus:state.sdgFocus,routeLimit:state.routeLimit,ignoreTrendSignals:state.ignoreTrendSignals,
    roleId: state.roleId, selections: state.selections, skills: state.skills, scenario: state.scenario,
    hoursPerWeek: state.hoursPerWeek, freeOnly: state.freeOnly, customTasks: state.customTasks,
    customSignals: state.customSignals.filter((signal) => state.appliedSignalIds.includes(signal.id)),
  }
}

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value)
const exposure = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1

export async function fetchAnalysis(state: AppState, options: { signal?: AbortSignal } = {}): Promise<RemoteAnalysis> {
  const response = await fetch('/api/analysis', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisRequest(state)), signal: options.signal,
    cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer',
  })
  if (!response.ok) throw new Error('API verification is unavailable')
  const body: unknown = await response.json()
  if (!record(body) || (body.scenario !== 'slow' && body.scenario !== 'normal' && body.scenario !== 'fast') || !exposure(body.roleExposure) || !Array.isArray(body.tasks) || !Array.isArray(body.routes)) throw new Error('Invalid API analysis')
  const tasks = body.tasks.map((task: unknown) => {
    if (!record(task) || typeof task.id !== 'string' || !exposure(task.exposure)) throw new Error('Invalid API task')
    return { id: task.id, exposure: task.exposure }
  })
  const routes = body.routes.map((route: unknown) => {
    if (!record(route) || typeof route.roleId !== 'string') throw new Error('Invalid API route')
    return { roleId: route.roleId }
  })
  return { scenario: body.scenario, roleExposure: body.roleExposure, tasks, routes }
}

export function compareAnalysis(state: AppState, remote: RemoteAnalysis, local = analyze(state)) {
  // Python and JavaScript may differ in the last floating-point bits.
  const equal = (a: number, b: number) => Math.abs(a - b) <= 1e-6
  const byId = new Map(remote.tasks.map((task) => [task.id, task.exposure]))
  const matchedTasks = local.scored.filter((task) => byId.has(task.id) && equal(task.exposure, byId.get(task.id)!)).length
  const tasksMatch = matchedTasks === local.scored.length && remote.tasks.length === local.scored.length && byId.size === remote.tasks.length
  const roleExposureMatches = equal(local.exposure, remote.roleExposure)
  const routeOrderMatches = local.routes.length === remote.routes.length && local.routes.every((route, index) => route.roleId === remote.routes[index].roleId)
  return {
    matches: tasksMatch && roleExposureMatches && routeOrderMatches && remote.scenario === state.scenario,
    matchedTasks, totalTasks: local.scored.length, roleExposureMatches, routeOrderMatches,
  }
}
