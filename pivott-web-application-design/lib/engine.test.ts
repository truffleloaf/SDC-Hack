import { describe, expect, it } from 'vitest'
import {
  buildPathway,
  signalWeight,
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


describe('scoring assumptions', () => {
  it('has no invented publication metadata and stays independent of the clock', () => {
    const assumptions = signals.filter((s) => s.evidence === 'assumption')
    expect(assumptions).toHaveLength(12)
    for (const signal of assumptions) {
      expect(signal).not.toHaveProperty('date')
      expect(signal).not.toHaveProperty('sourceName')
      expect(signal).not.toHaveProperty('sourceUrl')
      expect(signalWeight(signal, '2030-01-01')).toBe(signalWeight(signal))
    }
  })
  it('preserves the original Normal demonstration score', () => {
    expect(roleExposure(scoreTasks(selections, lookup, 'normal', signals))).toBeCloseTo(0.6190312308415231, 12)
  })
})


describe('derived learning context', () => {
  it('returns the rated shortfall without promotional claims', () => {
    const plan = buildPathway({ targetRoleId: 'finance-systems-analyst', levels: demoPersona.skills, hoursPerWeek: 6, freeOnly: true })
    for (const step of plan.steps) {
      expect(step).not.toHaveProperty('why')
      expect(step.current).toBe(demoPersona.skills[step.skillId as keyof typeof demoPersona.skills])
      expect(step.required).toBeGreaterThan(step.current)
    }
  })
})


describe('partial fit bounds', () => {
  const base = { currentRoleId: 'finance-admin', userTaskSkills: taskSkills, signals, hoursPerWeek: 6, scenarioId: 'normal' as const, limit: 10 }
  it('cannot inflate a single rated skill above the full demo fit', () => {
    const full = computeRoutes({ ...base, levels: demoPersona.skills })
    const partial = computeRoutes({ ...base, levels: { excel: 3 } })
    for (const route of partial) {
      expect(route.fitLow).toBeLessThanOrEqual(full.find((r) => r.roleId === route.roleId)!.fit)
      expect(route.fitLow).toBeLessThanOrEqual(route.fitHigh)
      expect(route.fit).toBe(route.fitLow)
      expect(route.ratedShare).toBeLessThan(1)
    }
    for (const route of full) { expect(route.fitLow).toBeCloseTo(route.fitHigh, 12); expect(route.ratedShare).toBe(1) }
  })
  it('keeps unknown ratings out of learning gaps, including an entirely unrated profile', () => {
    for (const route of computeRoutes({ ...base, levels: {} })) { expect(route.ratedShare).toBe(0); expect(route.fitHigh).toBeGreaterThan(route.fitLow); expect(route.gaps).toEqual([]) }
  })
})


describe('preview multiplier', () => {
  it('updates task exposure and route ordering without changing fit', () => {
    const base = { currentRoleId: 'finance-admin', userTaskSkills: taskSkills, levels: demoPersona.skills, signals, hoursPerWeek: 6, scenarioId: 'normal' as const }
    const normal = computeRoutes(base), preview = computeRoutes({ ...base, previewMultiplier: 1.4 })
    expect(preview[0].roleId).not.toBe(normal[0].roleId)
    for (const route of preview) { const old = normal.find((r) => r.roleId === route.roleId); if (old) { expect(route.fit).toBe(old.fit); expect(route.targetExposure).toBeGreaterThanOrEqual(old.targetExposure) } }
    expect(roleExposure(scoreTasks(selections, lookup, 'normal', signals, 1.4))).toBeGreaterThan(roleExposure(scoreTasks(selections, lookup, 'normal', signals)))
  })
})
