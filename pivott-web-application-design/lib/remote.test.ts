import { afterEach, describe, expect, it, vi } from 'vitest'
import golden from '../../backend/tests/golden.json'
import { POST } from '../app/api/analysis/route'
import { parseProfile } from './api'
import { analysisRequest, compareAnalysis, fetchAnalysis } from './remote'
import { analyze, demoState, type AppState } from './store'

const post = (body: unknown) => POST(new Request('http://localhost/api/analysis', { method: 'POST', body: JSON.stringify(body) }))
const customState = (): AppState => {
  const parsed = parseProfile(golden.customProfile)
  if (!parsed.ok) throw new Error(parsed.error)
  return { ...demoState(), ...parsed.value, customTasks: parsed.value.customTasks ?? [], customSignals: parsed.value.customSignals ?? [], appliedSignalIds: ['user-parity'] }
}
afterEach(() => vi.unstubAllGlobals())

describe('API verification', () => {
  it.each(['normal', 'fast'] as const)('matches %s demo/custom analyses through the Next handler and shared goldens', async (scenario) => {
    for (const base of [demoState(), customState()]) {
      const state = { ...base, scenario }
      const response = await post(analysisRequest(state))
      expect(response.status).toBe(200)
      expect(compareAnalysis(state, await response.json()).matches).toBe(true)
    }
    const response = await post({ ...golden.customProfile, scenario })
    const expected = scenario === 'normal' ? golden.analysisCustomNormal : golden.analysisCustomFast
    expect(await response.json()).toEqual({ ...expected, illustrative: true })
  })

  it('sends only applied signals, without names or progress, to the same-origin API', async () => {
    const state = customState()
    state.customSignals.push({ ...state.customSignals[0], id: 'user-pending' })
    const local = analyze(state)
    const mock = vi.fn().mockResolvedValue(Response.json({ scenario: state.scenario, roleExposure: local.exposure, tasks: local.scored, routes: local.routes }))
    vi.stubGlobal('fetch', mock)
    expect(compareAnalysis(state, await fetchAnalysis(state)).matches).toBe(true)
    expect(mock.mock.calls[0][0]).toBe('/api/analysis')
    const options = mock.mock.calls[0][1]
    const body = JSON.parse(options.body)
    expect(body).not.toHaveProperty('name')
    expect(body).not.toHaveProperty('completedSteps')
    expect(body.customSignals.map((signal: { id: string }) => signal.id)).toEqual(['user-parity'])
    expect(options.credentials).toBe('omit')
  })

  it('detects exposure, task-count, scenario and route-order mismatches', () => {
    const state = demoState()
    const local = analyze(state)
    const remote = { scenario: state.scenario, roleExposure: local.exposure, tasks: local.scored, routes: local.routes }
    expect(compareAnalysis(state, { ...remote, roleExposure: local.exposure + 0.01 }).matches).toBe(false)
    expect(compareAnalysis(state, { ...remote, tasks: local.scored.slice(1) }).matches).toBe(false)
    expect(compareAnalysis(state, { ...remote, routes: [...local.routes].reverse() }).matches).toBe(false)
    expect(compareAnalysis(state, { ...remote, scenario: 'fast' }).matches).toBe(false)
  })

  it('rejects failed, malformed and offline responses without changing local results', async () => {
    const state = demoState()
    const before = analyze(state)
    for (const response of [Response.json({}, { status: 503 }), Response.json({ scenario: 'normal', roleExposure: 'NaN' })]) {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))
      await expect(fetchAnalysis(state)).rejects.toThrow()
    }
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(fetchAnalysis(state)).rejects.toThrow('offline')
    expect(analyze(state)).toEqual(before)
  })
})

describe('custom input validation', () => {
  it('clamps input ranges and never accepts a user-supplied verified label', () => {
    const raw = structuredClone(golden.customProfile)
    raw.customTasks[0].baseExposure = -3
    raw.customTasks[0].humanJudgment = 9
    raw.customTasks[0].skills.push('unknown')
    raw.customSignals[0].strength = 9
    raw.customSignals[0].impacts[0].impact = 9
    raw.customSignals[0].evidence = 'verified'
    const parsed = parseProfile(raw)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(parsed.value.customTasks?.[0]).toMatchObject({ baseExposure: 0, humanJudgment: 1, skills: ['analysis', 'writing'] })
    expect(parsed.value.customSignals?.[0]).toMatchObject({ strength: 1, evidence: 'user', impacts: [{ taskId: 'fa-invoice', impact: 0.4 }, { taskId: 'custom-review', impact: 0.15 }] })
  })

  it.each(['2026-02-30', '2026-13-01', 'not-a-date', '2099-01-01', '2026-10-01suffix'])('rejects invalid dates: %s', async (date) => {
    const raw = structuredClone(golden.customProfile)
    raw.customSignals[0].date = date
    expect((await post(raw)).status).toBe(400)
  })

  it('rejects seed overrides, duplicate ids, unknown impacts, invalid URLs and non-finite scores', async () => {
    for (const change of [
      (raw: typeof golden.customProfile) => { raw.customTasks[0].id = 'fa-invoice' },
      (raw: typeof golden.customProfile) => { raw.customTasks.push(raw.customTasks[0]) },
      (raw: typeof golden.customProfile) => { raw.customSignals[0].impacts[0].taskId = 'unknown' },
      (raw: typeof golden.customProfile) => { raw.customSignals[0].sourceUrl = 'javascript:alert(1)' },
      (raw: typeof golden.customProfile) => { raw.customTasks[0].baseExposure = Infinity },
    ]) {
      const raw = structuredClone(golden.customProfile)
      change(raw)
      expect((await post(raw)).status).toBe(400)
    }
    const parsed = parseProfile({ roleId: 'finance-admin', hoursPerWeek: 0 })
    expect(parsed.ok && parsed.value.hoursPerWeek).toBe(6)
    expect(parseProfile({ roleId: 'toString' }).ok).toBe(false)
  })
})
