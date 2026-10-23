import { expect, it } from 'vitest'
import type { Role } from './data/seed'
import { planProgress } from './plan-progress'
const role: Role = { id:'target',title:'Target',family:'Test',demand:0,sdgs:[],requirements:[{skillId:'erp',requiredLevel:4,importance:1},{skillId:'sql',requiredLevel:2,importance:1}] }
it('keeps completed work when accepting a rating increase removes that learning gap', () => {
  const done=['target:erp']
  const before=planProgress(role,[{id:'target:erp'},{id:'target:sql'}],done,{erp:3,sql:0})
  const after=planProgress(role,[{id:'target:sql'}],done,{erp:4,sql:0})
  expect(before.progress).toBe(0.5);expect(after.progress).toBe(0.5);expect(after.doneCount).toBe(1)
})
it('distinguishes an unestimated plan from fully rated requirements with no remaining gaps', () => {
  expect(planProgress(role,[],[],{}).complete).toBe(false)
  expect(planProgress(role,[],[],{}).progress).toBe(0)
  expect(planProgress(role,[],[],{erp:4,sql:2}).complete).toBe(true)
  expect(planProgress(role,[],['another:erp','target:fake'],{erp:4,sql:2}).doneCount).toBe(0)
})
