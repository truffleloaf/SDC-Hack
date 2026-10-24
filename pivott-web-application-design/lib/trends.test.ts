import { describe,it,expect } from 'vitest'
import { computeRoutes } from './engine'
import { demoPersona, signals } from './data/seed'
describe('trend adjustments',()=>{it('changes route scores against baseline',()=>{const base={currentRoleId:'finance-admin',userTaskSkills:['excel','erp'],levels:demoPersona.skills,scenarioId:'normal' as const,hoursPerWeek:6,limit:20};const without=computeRoutes({...base,signals:[]});const withSignals=computeRoutes({...base,signals});expect(withSignals.some(r=>Math.abs(r.score-without.find(b=>b.roleId===r.roleId)!.score)>.001)).toBe(true)})})
