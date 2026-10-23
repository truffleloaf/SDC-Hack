import { customRole, roleById, signals as seedSignals, skills, taskById, type Signal } from './data/seed'
import { parseCustomInputs } from './custom-inputs'
import type { CustomTask, ScenarioId } from './engine'

export interface ProfileInput {
  roleId: string
  selections: { taskId: string; share: number }[]
  skills: Record<string, number>
  scenario: ScenarioId
  hoursPerWeek: number
  freeOnly: boolean
  customTasks?: CustomTask[]
  customSignals?: Signal[]
  targetRoleId?: string
}

function finiteNumber(value: unknown) {
  const number = typeof value === 'number' || typeof value === 'string' || typeof value === 'boolean' ? Number(value) : 0
  return Number.isFinite(number) ? number : 0
}

const skillIds = new Set(skills.map((s) => s.id))

export function parseProfile(body: unknown): { ok: true; value: ProfileInput } | { ok: false; error: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'Body must be a JSON object' }
  const b = body as Record<string, unknown>
  const roleId = typeof b.roleId === 'string' ? b.roleId : ''
  if (!Object.hasOwn(roleById, roleId)) return { ok: false, error: 'Unknown roleId' }

  const custom = parseCustomInputs(b)
  if (!custom.ok) return custom
  const lookup = { ...taskById, ...Object.fromEntries(custom.customTasks.map((task) => [task.id, task])) }
  const rawSel = Array.isArray(b.selections) ? b.selections : []
  const selections = rawSel
    .filter((s): s is { taskId: string; share: number } => !!s && typeof s === 'object' && typeof (s as never)['taskId'] === 'string')
    .filter((s) => Object.hasOwn(lookup, s.taskId))
    .map((s) => ({ taskId: s.taskId, share: Math.max(0, Math.min(100, finiteNumber(s.share))) }))
    .slice(0, 100)

  const levels: Record<string, number> = {}
  if (b.skills && typeof b.skills === 'object') {
    for (const [k, v] of Object.entries(b.skills as Record<string, unknown>)) {
      if (skillIds.has(k)) levels[k] = Math.max(0, Math.min(4, Math.round(finiteNumber(v))))
    }
  }

  const scenario: ScenarioId = b.scenario === 'fast' ? 'fast' : 'normal'
  const hoursPerWeek = Math.max(1, Math.min(40, Math.round(finiteNumber(b.hoursPerWeek) || 6)))
  const targetRoleId = typeof b.targetRoleId === 'string' && roleById[b.targetRoleId] && b.targetRoleId !== customRole.id ? b.targetRoleId : undefined

  return {
    ok: true,
    value: {
      roleId, selections, skills: levels, scenario, hoursPerWeek, freeOnly: b.freeOnly === true, targetRoleId,
      ...(b.customTasks !== undefined ? { customTasks: custom.customTasks } : {}),
      ...(b.customSignals !== undefined ? { customSignals: custom.customSignals } : {}),
    },
  }
}

export const allSignals = (customSignals: Signal[] = []) => [...seedSignals, ...customSignals]

export function encodeId(obj: unknown) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url')
}

export function decodeId(id: string): unknown {
  try {
    return JSON.parse(Buffer.from(id, 'base64url').toString('utf8'))
  } catch {
    return null
  }
}

export const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } })
