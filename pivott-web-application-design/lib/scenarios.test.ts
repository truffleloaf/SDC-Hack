import {describe,it,expect} from 'vitest'
import {compareScenarios,routeConfidence,computeRoutes} from './engine'
import {demoPersona,signals,tasksForRole} from './data/seed'
const params={currentRoleId:'finance-admin',userTaskSkills:[...new Set(tasksForRole('finance-admin').flatMap(t=>t.skills))],levels:demoPersona.skills,signals,hoursPerWeek:6}
describe('scenario uncertainty',()=>{
 it('shows every scenario and explains rank changes',()=>{const rows=compareScenarios(params);for(const row of rows){expect(row.scores.map(s=>s.scenario)).toEqual(['slow','normal','fast']);expect(row.low).toBeLessThanOrEqual(row.high);for(const s of row.scores){const actual=computeRoutes({...params,scenarioId:s.scenario,limit:20});expect(s.rank).toBe(actual.findIndex(r=>r.roleId===row.roleId)+1);expect(s.score).toBe(actual.find(r=>r.roleId===row.roleId)!.score)}}expect(rows.some(r=>new Set(r.scores.map(s=>s.rank)).size>1)).toBe(true)})
 it.each([[4,5,3,5,'High'],[4,5,2,5,'Medium'],[2,5,3,5,'Low'],[4,5,3,13,'Low'],[0,0,5,0,'Low']] as const)('confidence(%i,%i,%i,%i) = %s',(rated,total,recent,spread,label)=>expect(routeConfidence(rated,total,recent,spread)).toBe(label))
})
