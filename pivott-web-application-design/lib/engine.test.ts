import { describe, expect, it } from 'vitest'
import {
  buildPathway,
  classify,
  computeRoutes,
  learningWeeks,
  recency,
  roleExposure,
  roleFit,
  scoreTasks,
  signalAdjustment,
  skillCoverage,
  skillGaps,
  taskExposure,
} from './engine'
import { demoPersona, roleById, signals, tasksForRole, type Signal } from './data/seed'

const aisyahTasks = tasksForRole('finance-admin')
const lookup = Object.fromEntries(aisyahTasks.map((t) => [t.id, t]))
const selections = aisyahTasks.map((t) => ({ taskId: t.id, share: t.defaultShare }))
const taskSkills = [...new Set(aisyahTasks.flatMap((t) => t.skills))]

describe('recency', () => {
  it('halves every 180 days', () => {
    expect(recency(0)).toBe(1)
    expect(recency(180)).toBeCloseTo(0.5)
    expect(recency(360)).toBeCloseTo(0.25)
  })
})

describe('signal adjustment', () => {
  it('is clamped to ±0.2', () => {
    const strong: Signal[] = Array.from({ length: 5 }, (_, i) => ({
      id: `x${i}`,
      date: '2026-10-01',
      headline: '',
      sourceName: '',
      sourceUrl: '',
      direction: 1,
      strength: 1,
      impacts: [{ taskId: 't', impact: 1 }],
      explanation: '',
      evidence: 'user',
    }))
    expect(signalAdjustment('t', strong)).toBe(0.2)
    expect(signalAdjustment('t', strong.map((s) => ({ ...s, direction: -1 as const })))).toBe(-0.2)
  })
})

describe('task exposure', () => {
  it('applies multiplier then adjustment, clamped to [0, 1]', () => {
    expect(taskExposure(0.5, 1.25, 0.1)).toBeCloseTo(0.725)
    expect(taskExposure(0.9, 1.25, 0.2)).toBe(1)
    expect(taskExposure(0.05, 1, -0.2)).toBe(0)
  })
})

describe('classification', () => {
  it('follows the documented thresholds', () => {
    expect(classify(0.7, 0.3)).toBe('Automate')
    expect(classify(0.7, 0.7)).toBe('Protect')
    expect(classify(0.5, 0.5)).toBe('Augment')
    expect(classify(0.65, 0.4)).toBe('Augment')
  })
})

describe('role exposure for Aisyah', () => {
  it('is 62% under the Normal scenario and higher under Fast', () => {
    const normal = roleExposure(scoreTasks(selections, lookup, 'normal', signals))
    const fast = roleExposure(scoreTasks(selections, lookup, 'fast', signals))
    expect(Math.round(normal * 100)).toBe(62)
    expect(fast).toBeGreaterThan(normal)
  })
})

describe('skill coverage, fit, and gaps', () => {
  const role = roleById['finance-systems-analyst']
  it('caps each skill contribution at 1', () => {
    expect(skillCoverage(role, { erp: 9, controls: 9, automation: 9, sql: 9, stakeholder: 9, process: 9, excel: 9 })).toBe(1)
  })
  it('falls back to coverage when similarity is unavailable', () => {
    expect(roleFit(0.5, null)).toBe(50)
    expect(roleFit(0.5, 1)).toBeCloseTo(60)
  })
  it('computes gap priority from importance and demand', () => {
    const gaps = skillGaps(role, demoPersona.skills)
    const sql = gaps.find((g) => g.skillId === 'sql')!
    expect(sql.gap).toBe(2)
    expect(sql.priority).toBeCloseTo(2 * 3 * 0.78)
  })
  it('rounds learning weeks up', () => {
    expect(learningWeeks(61, 6)).toBe(11)
    expect(learningWeeks(0, 6)).toBe(0)
  })
})

describe('routes', () => {
  it('re-ranks between scenarios based on underlying exposure', () => {
    const base = { currentRoleId: 'finance-admin', userTaskSkills: taskSkills, levels: demoPersona.skills, signals, hoursPerWeek: 6 }
    const normal = computeRoutes({ ...base, scenarioId: 'normal' })
    const fast = computeRoutes({ ...base, scenarioId: 'fast' })
    expect(normal[0].roleId).toBe('operations-coordinator')
    expect(fast[0].roleId).toBe('finance-systems-analyst')
  })
})

describe('pathway', () => {
  it('only picks free resources when requested', () => {
    const { steps } = buildPathway({ targetRoleId: 'finance-systems-analyst', levels: demoPersona.skills, hoursPerWeek: 6, freeOnly: true })
    expect(steps.length).toBeGreaterThan(0)
    expect(steps.every((s) => s.resource === null || s.resource.free)).toBe(true)
  })
})
