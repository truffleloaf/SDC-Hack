import {
  DATA_AS_OF,
  type Role,
  type Scenario,
  type Signal,
  type Task,
  resources,
  roleById,
  roles,
  scenarios,
  skillById,
  tasksForRole,
} from './data/seed'

export type ScenarioId = Scenario['id']
export type Classification = 'Automate' | 'Augment' | 'Protect'

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

const DAY_MS = 86_400_000

export function ageDays(date: string, asOf: string = DATA_AS_OF) {
  return Math.max(0, (Date.parse(asOf) - Date.parse(date)) / DAY_MS)
}

/** recency = 0.5 ^ (age_days / 180) */
export function recency(age: number) {
  return Math.pow(0.5, age / 180)
}

/** Assumptions use a fixed editorial weight, without pretending to have a publication date. */
export function signalWeight(signal: Signal, asOf: string = DATA_AS_OF) {
  return signal.evidence === 'assumption' ? signal.assumptionWeight : signal.strength * recency(ageDays(signal.date, asOf))
}

/** signal_adjustment(task) = clamp(sum(strength × direction × recency × impact), -0.2, 0.2) */
export function signalAdjustment(taskId: string, signals: Signal[], asOf: string = DATA_AS_OF) {
  let sum = 0
  for (const s of signals) {
    for (const i of s.impacts) {
      if (i.taskId !== taskId) continue
      sum += signalWeight(s, asOf) * s.direction * i.impact
    }
  }
  return clamp(sum, -0.2, 0.2)
}

export function getScenario(id: ScenarioId) {
  return scenarios.find((s) => s.id === id) ?? scenarios.find(s=>s.id==='normal') ?? scenarios[0]
}

/** exposure(task, scenario) = clamp(base_exposure × scenario.multiplier + signal_adjustment, 0, 1) */
export function taskExposure(base: number, multiplier: number, adjustment: number) {
  return clamp(base * multiplier + adjustment, 0, 1)
}

export function classify(exposure: number, humanJudgment: number): Classification {
  if (exposure >= 0.65 && humanJudgment < 0.4) return 'Automate'
  if (humanJudgment >= 0.65) return 'Protect'
  return 'Augment'
}

export interface ShareInput {
  taskId: string
  share: number
}

/** Normalises arbitrary weights to fractions summing to 1. */
export function normalizeShares<T extends { share: number }>(items: T[]): T[] {
  const total = items.reduce((a, b) => a + Math.max(0, b.share), 0)
  if (total <= 0) return items.map((i) => ({ ...i, share: items.length ? 1 / items.length : 0 }))
  return items.map((i) => ({ ...i, share: Math.max(0, i.share) / total }))
}

/** role_exposure = sum(time_share × exposure) */
export function roleExposure(items: { share: number; exposure: number }[]) {
  return items.reduce((a, b) => a + b.share * b.exposure, 0)
}

export interface CustomTask {
  id: string
  name: string
  skills: string[]
  baseExposure?: number
  humanJudgment?: number
}

export interface ScoredTask {
  id: string
  name: string
  description: string
  share: number
  baseExposure: number
  adjustment: number
  exposure: number
  humanJudgment: number
  classification: Classification
  skills: string[]
  tryThisWeek: string
  custom: boolean
}

export function scoreTasks(
  selections: ShareInput[],
  taskLookup: Record<string, Task | CustomTask>,
  scenarioId: ScenarioId,
  signals: Signal[],
  previewMultiplier?: number,
): ScoredTask[] {
  const multiplier = previewMultiplier === undefined ? getScenario(scenarioId).multiplier : clamp(previewMultiplier, .75, 1.5)
  const normalized = normalizeShares(selections.filter((s) => taskLookup[s.taskId] && 'roleId' in taskLookup[s.taskId]))
  return normalized.map(({ taskId, share }) => {
    const t = taskLookup[taskId]
    if (!('roleId' in t)) throw new Error('Only reference tasks have an exposure assessment')
    const adjustment = signalAdjustment(taskId, signals)
    const exposure = taskExposure(t.baseExposure!, multiplier, adjustment)
    const isSeed = 'roleId' in t
    return {
      id: taskId,
      name: t.name,
      description: isSeed ? t.description : 'Your own task',
      share,
      baseExposure: t.baseExposure,
      adjustment,
      exposure,
      humanJudgment: t.humanJudgment!,
      classification: classify(exposure, t.humanJudgment!),
      skills: t.skills,
      tryThisWeek: isSeed
        ? t.tryThisWeek
        : 'Try one AI-assisted run of this task and note which steps still needed your judgment.',
      custom: !isSeed,
    }
  })
}

/** Exposure is conditional on assessed reference tasks; custom tasks stay unknown. */
export function assessmentSummary(selections: ShareInput[], lookup: Record<string, Task | CustomTask>) {
  const valid = normalizeShares(selections.filter((item) => lookup[item.taskId]))
  const unassessedTasks = valid.filter((item) => !('roleId' in lookup[item.taskId])).map((item) => ({ id: item.taskId, name: lookup[item.taskId].name, share: item.share }))
  return { assessmentCoverage: valid.filter((item) => 'roleId' in lookup[item.taskId]).reduce((sum, item) => sum + item.share, 0), unassessedTasks }
}

/** Conservative coverage includes all requirements in the denominator; unknowns remain separate. */
export function skillCoverage(role: Role, levels: Record<string, number>) {
  const rated = role.requirements.filter((r) => levels[r.skillId] !== undefined)
  const totalImportance = role.requirements.reduce((a, r) => a + r.importance, 0)
  if (!totalImportance) return 0
  const covered = rated.reduce(
    (a, r) => a + r.importance * Math.min((levels[r.skillId] ?? 0) / r.requiredLevel, 1),
    0,
  )
  return covered / totalImportance
}

/** Jaccard similarity between the skills used in the user’s tasks and the target role’s tasks. */
export function taskSimilarity(userSkills: string[], targetRoleId: string): number | null {
  const target = new Set(tasksForRole(targetRoleId).flatMap((t) => t.skills))
  const user = new Set(userSkills)
  if (!target.size || !user.size) return null
  let inter = 0
  for (const s of user) if (target.has(s)) inter++
  const union = new Set([...user, ...target]).size
  return inter / union
}

/** fit = 100 × (0.8 × skill_coverage + 0.2 × task_similarity); falls back to coverage */
export function roleFit(coverage: number, similarity: number | null) {
  if (similarity === null) return 100 * coverage
  return 100 * (0.8 * coverage + 0.2 * similarity)
}

export interface SkillGap {
  skillId: string
  name: string
  current: number
  required: number
  gap: number
  importance: number
  priority: number
  hours: number
}

/** gap = max(0, required − current); gap_priority = gap × importance × (role_demand / 100) */
export function skillGaps(role: Role, levels: Record<string, number>): SkillGap[] {
  return role.requirements
    .filter((r) => levels[r.skillId] !== undefined)
    .map((r) => {
      const current = levels[r.skillId] ?? 0
      const gap = Math.max(0, r.requiredLevel - current)
      const skill = skillById[r.skillId]
      return {
        skillId: r.skillId,
        name: skill?.name ?? r.skillId,
        current,
        required: r.requiredLevel,
        gap,
        importance: r.importance,
        priority: gap * r.importance * (role.demand / 100),
        hours: gap * (skill?.hoursPerLevel ?? 10),
      }
    })
    .filter((g) => g.gap > 0)
    .sort((a, b) => b.priority - a.priority || a.name.localeCompare(b.name))
}

/** weeks = ceil(sum(gap_hours) / hours_per_week) */
export function learningWeeks(totalHours: number, hoursPerWeek: number) {
  if (totalHours <= 0) return 0
  return Math.ceil(totalHours / Math.max(1, hoursPerWeek))
}

/** Default-time-share exposure for a role under a scenario. */
export function targetRoleExposure(roleId: string, scenarioId: ScenarioId, signals: Signal[], previewMultiplier?: number) {
  const list = tasksForRole(roleId)
  const lookup = Object.fromEntries(list.map((t) => [t.id, t]))
  const scored = scoreTasks(
    list.map((t) => ({ taskId: t.id, share: t.defaultShare })),
    lookup,
    scenarioId,
    signals,
    previewMultiplier,
  )
  return roleExposure(scored)
}

/** route_score = 0.7 × fit + 0.3 × 100 × (1 − target_exposure). Ranks lower-risk adjacent roles. */
export function routeScore(fit: number, targetExposure: number) {
  return 0.7 * fit + 0.3 * 100 * (1 - targetExposure)
}

export interface RouteResult {
  roleId: string
  title: string
  family: string
  demand: number
  coverage: number
  similarity: number | null
  fit: number
  fitLow: number
  fitHigh: number
  ratedShare: number
  targetExposure: number
  score: number
  gaps: SkillGap[]
  totalGapHours: number
  weeks: number
  sdgs: number[]
  unadjustedScore: number
  unadjustedRank: number
  sdgBonus: number
  unknownSkillIds: string[]
}

export function computeRoutes(params: {
  currentRoleId: string
  userTaskSkills: string[]
  levels: Record<string, number>
  scenarioId: ScenarioId
  signals: Signal[]
  hoursPerWeek: number
  limit?: number
  previewMultiplier?: number
  sdgFocus?: number[]
}): RouteResult[] {
  const { currentRoleId, userTaskSkills, levels, scenarioId, signals, hoursPerWeek, limit = 3, previewMultiplier } = params
  return roles
    .filter((r) => r.id !== currentRoleId)
    .map((role) => {
      const coverage = skillCoverage(role, levels)
      const similarity = taskSimilarity(userTaskSkills, role.id)
      const unknownSkillIds = role.requirements.filter((r) => levels[r.skillId] === undefined).map((r) => r.skillId)
      const totalImportance = role.requirements.reduce((sum, r) => sum + r.importance, 0)
      const ratedShare = totalImportance ? role.requirements.filter((r) => levels[r.skillId] !== undefined).reduce((sum, r) => sum + r.importance, 0) / totalImportance : 1
      const fitLow = roleFit(coverage, similarity)
      const fitHigh = roleFit(Math.min(1, coverage + 1 - ratedShare), similarity)
      const fit = fitLow
      const exposure = targetRoleExposure(role.id, scenarioId, signals, previewMultiplier)
      const gaps = skillGaps(role, levels)
      const totalGapHours = gaps.reduce((a, g) => a + g.hours, 0)
      return {
        roleId: role.id,
        title: role.title,
        family: role.family,
        demand: role.demand,
        coverage,
        similarity,
        fit, fitLow, fitHigh, ratedShare,
        targetExposure: exposure,
        score: routeScore(fit, exposure),
        gaps,
        totalGapHours,
        weeks: learningWeeks(totalGapHours, hoursPerWeek),
        sdgs: role.sdgs,
        unknownSkillIds,
      }
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
    .map((route,index) => {
      const sdgBonus=Math.min(10,5 * route.sdgs.filter(id => params.sdgFocus?.includes(id)).length)
      return {...route,unadjustedRank:index+1,unadjustedScore:route.score,sdgBonus,score:route.score+sdgBonus}
    })
    .sort((a,b)=>b.score-a.score || a.title.localeCompare(b.title))
    .slice(0, limit)
}

export interface PathwayStep {
  id: string
  skillId: string
  title: string
  skills: string[]
  resource: { title: string; provider: string; url: string; free: boolean; cost?: string; hrdCorp?: boolean } | null
  hours: number
  startWeek: number
  endWeek: number
  deliverable: string
  priority: number
  importance: number
  current: number
  required: number
}

export function buildPathway(params: {
  targetRoleId: string
  levels: Record<string, number>
  hoursPerWeek: number
  freeOnly: boolean
}) {
  const role = roleById[params.targetRoleId]
  if (!role) return { steps: [] as PathwayStep[], totalHours: 0, weeks: 0 }
  const gaps = skillGaps(role, params.levels)
  let cursor = 0
  const steps: PathwayStep[] = gaps.map((g) => {
    const options = resources.filter((r) => r.skillId === g.skillId)
    const resource = (params.freeOnly ? options.find((r) => r.free) : options[0]) ?? null
    const startHours = cursor
    cursor += g.hours
    const skill = skillById[g.skillId]
    return {
      id: `${role.id}:${g.skillId}`,
      skillId: g.skillId,
      title: `${g.current === 0 ? 'Start' : 'Level up'}: ${g.name}`,
      skills: [g.skillId],
      resource: resource
        ? { title: resource.title, provider: resource.provider, url: resource.url, free: resource.free, ...(resource.cost ? {cost:resource.cost}:{}), ...(resource.hrdCorp ? {hrdCorp:true}:{}) }
        : null,
      hours: g.hours,
      startWeek: Math.floor(startHours / Math.max(1, params.hoursPerWeek)) + 1,
      endWeek: Math.max(1, Math.ceil(cursor / Math.max(1, params.hoursPerWeek))),
      deliverable: skill?.deliverable ?? 'A small practical project',
      priority: g.priority, importance:g.importance,
      current: g.current,
      required: g.required,
    }
  })
  return { steps, totalHours: cursor, weeks: learningWeeks(cursor, params.hoursPerWeek) }
}

/** Interpolates mint → yellow → peach for a 0–1 exposure value. */
export function exposureColor(exposure: number) {
  const stops = [
    [0x5e, 0xea, 0xd4],
    [0xfd, 0xe6, 0x8a],
    [0xfd, 0xba, 0x74],
  ]
  const t = clamp((exposure - 0.2) / 0.6, 0, 1) * 2
  const i = Math.min(1, Math.floor(t))
  const f = t - i
  const [a, b] = [stops[i], stops[i + 1]]
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f))
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`
}

export function exposureBand(exposure: number): 'Lower' | 'Medium' | 'Higher' {
  if (exposure < 0.45) return 'Lower'
  if (exposure < 0.65) return 'Medium'
  return 'Higher'
}

/**
 * Confidence reflects evidence quality, not certainty about outcomes:
 * coverage = share of time on tasks referenced by at least one signal;
 * verified = share of recency-weighted signal weight from published sources.
 */
export function confidence(tasks: ScoredTask[], signals: Signal[]): 'High' | 'Medium' | 'Low' {
  const ids = new Set(tasks.map((t) => t.id))
  const covered = tasks
    .filter((t) => signals.some((s) => s.impacts.some((i) => i.taskId === t.id)))
    .reduce((a, t) => a + t.share, 0)
  let total = 0
  let verified = 0
  for (const s of signals) {
    for (const i of s.impacts) {
      if (!ids.has(i.taskId)) continue
      const w = signalWeight(s) * i.impact
      total += w
      if (s.evidence === 'verified') verified += w
    }
  }
  const verifiedShare = total ? verified / total : 0
  if (covered >= 0.8 && verifiedShare >= 0.6) return 'High'
  if (covered >= 0.5) return 'Medium'
  return 'Low'
}

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`


export function fitLabel(route: Pick<RouteResult, 'fitLow' | 'fitHigh' | 'ratedShare'>) {
  return route.ratedShare < 1 ? `${Math.round(route.fitLow)}–${Math.round(route.fitHigh)}%` : `${Math.round(route.fitLow)}%`
}

export function routeConfidence(rated:number,required:number,recentSignals:number,spread:number): 'Low'|'Medium'|'High' {
  const share=required ? rated/required : 0
  if(share>=.8 && recentSignals>=3 && spread<=5) return 'High'
  if(share>=.5 && spread<=12) return 'Medium'
  return 'Low'
}
export interface ScenarioComparison {
  roleId:string
  scores:{scenario:ScenarioId;rank:number;score:number;exposure:number}[]
  low:number
  high:number
  confidence:'Low'|'Medium'|'High'
  rated:number
  required:number
  recentSignals:number
  spread:number
}
export function compareScenarios(params: Omit<Parameters<typeof computeRoutes>[0],'scenarioId'|'limit'|'previewMultiplier'>): ScenarioComparison[] {
  const ids:ScenarioId[]=['slow','normal','fast']
  const matrix=ids.map(scenarioId=>computeRoutes({...params,scenarioId,limit:roles.length}))
  return roles.filter(r=>r.id!==params.currentRoleId).map(role=>{
    const scores=matrix.map((list,i)=>{const rank=list.findIndex(r=>r.roleId===role.id);const row=list[rank];return {scenario:ids[i],rank:rank+1,score:row.score,exposure:row.targetExposure}})
    const low=Math.min(...scores.map(s=>s.score)),high=Math.max(...scores.map(s=>s.score))
    const rated=role.requirements.filter(r=>params.levels[r.skillId]!==undefined).length,required=role.requirements.length
    const taskIds=new Set(tasksForRole(role.id).map(t=>t.id))
    const recentSignals=params.signals.filter(s=>s.evidence==='verified' && ageDays(s.date)<=180 && s.impacts.some(i=>taskIds.has(i.taskId))).length
    return {roleId:role.id,scores,low,high,rated,required,recentSignals,spread:high-low,confidence:routeConfidence(rated,required,recentSignals,high-low)}
  })
}
