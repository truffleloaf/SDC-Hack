import { describe, expect, it } from 'vitest'
import { assessmentSummary, computeRoutes, scoreTasks, skillCoverage, skillGaps } from './engine'
import { roles, signals, taskById } from './data/seed'
import { accountProfile, readAccountProfile, readAccountRow } from './account-data'
import { analyze, demoState, emptyState } from './store'
import { POST } from '../app/api/analysis/route'
import { analysisRequest, compareAnalysis } from './remote'

const role = roles.find((item) => item.id === 'data-analyst')!
describe('unknown inputs', () => {
  it('excludes unanswered requirements rather than scoring them as no experience', () => {
    const first = role.requirements[0]
    const partial = { [first.skillId]: first.requiredLevel }
    expect(skillCoverage(role, partial)).toBe(1)
    expect(skillGaps(role, partial)).toEqual([])
    expect(skillGaps(role, { [first.skillId]: 0 }).length).toBe(1)
    const route = computeRoutes({ currentRoleId: 'finance-admin', userTaskSkills: ['analysis'], levels: partial, scenarioId: 'normal', signals, hoursPerWeek: 6, limit: 10 }).find((item) => item.roleId === role.id)!
    expect(route.unknownSkillIds).toHaveLength(role.requirements.length - 1)
  })
  it('keeps custom tasks unassessed even when legacy data contains a numeric assumption', async () => {
    const custom = { id: 'custom-unknown', name: 'My task', skills: ['analysis'], baseExposure: 0.5, humanJudgment: 0.5 }
    expect(scoreTasks([{ taskId: custom.id, share: 100 }], { [custom.id]: custom }, 'normal', signals)).toEqual([])
    expect(assessmentSummary([{ taskId: custom.id, share: 100 }], { [custom.id]: custom })).toMatchObject({ assessmentCoverage: 0, unassessedTasks: [{ id: custom.id, share: 1 }] })
    const state = { ...demoState(), customTasks: [custom], selections: [...demoState().selections, { taskId: custom.id, share: 25 }] }
    const response = await POST(new Request('http://localhost/api/analysis', { method: 'POST', body: JSON.stringify(analysisRequest(state)) }))
    const remote = await response.json()
    expect(compareAnalysis(state, remote).matches).toBe(true)
    expect(remote.assessmentCoverage).toBeCloseTo(0.8)
    expect(remote.unassessedTasks).toHaveLength(1)
    expect(analyze(state).unassessed).toHaveLength(1)
  })
})

describe('account profile boundary', () => {
  const personal = { ...emptyState, roleId: 'finance-admin', jobTitle: 'Accounts Executive', skills: { excel: 0 }, updatedAt: '2026-10-23T00:00:00Z' }
  it('preserves explicit zero and missing ratings and new device preferences', () => {
    const restored = readAccountProfile(accountProfile(personal))
    expect(restored.skills.excel).toBe(0)
    expect(restored.skills.sql).toBeUndefined()
    expect(restored.jobTitle).toBe('Accounts Executive')
    expect(restored.mode).toBe('personal')
  })
  it('does not upload the separate demo profile', () => {
    expect(() => accountProfile(demoState())).toThrow('Exit the example')
  })
  it('validates revision and timestamp metadata before using an account response', () => {
    const row = { profile: personal, revision: 2, updated_at: '2026-10-23T00:00:00Z' }
    expect(readAccountRow(row).revision).toBe(2)
    for (const patch of [{ revision: 0 }, { revision: Infinity }, { revision: 1.5 }, { updated_at: 'not-a-date' }, { profile: null }]) expect(() => readAccountRow({ ...row, ...patch })).toThrow()
  })
  it.each([{ ...personal, skills: null }, { ...personal, selections: [null] }, { ...personal, roleId: 'unknown' }, { ...personal, skills: { excel: Infinity } }, { ...personal, completedSteps: null }])('rejects invalid saved data without replacing a device profile', (value) => {
    expect(() => readAccountProfile(value)).toThrow()
    expect(personal.skills.excel).toBe(0)
  })
})
