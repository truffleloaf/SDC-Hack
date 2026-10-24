import { describe,it,expect } from 'vitest'
import { roles,skills,sdgs,demoPersona } from './data/seed'
import live from './data/live-seed.json'
import {computeRoutes} from './engine'
import {contribution} from '../components/pivott/sdg-contribution'
describe('SDG choices',()=>{
 it('tags every role and skill with official goal IDs',()=>{expect(sdgs).toHaveLength(17);for(const item of [...roles,...skills,...live.roles,...live.skills]){expect(item.sdgs.length).toBeGreaterThan(0);expect(item.sdgs.every(id=>id>=1&&id<=17)).toBe(true)}})
 it('changes ranks with focus while preserving original score',()=>{const params={currentRoleId:'finance-admin',userTaskSkills:['excel'],levels:demoPersona.skills,scenarioId:'normal' as const,signals:[],hoursPerWeek:6,limit:20};const base=computeRoutes(params);const focused=computeRoutes({...params,sdgFocus:[10]});expect(focused.some(r=>r.sdgBonus>0)).toBe(true);expect(focused.some((r,i)=>base[i].roleId!==r.roleId)).toBe(true);for(const r of focused)expect(r.score).toBeCloseTo(r.unadjustedScore+r.sdgBonus)})
 it('aggregates route and gained skill tags without duplication',()=>{const ids=contribution('finance-systems-analyst',['sql','sql']);expect(ids).toEqual([...new Set([...roles.find(r=>r.id==='finance-systems-analyst')!.sdgs,...skills.find(s=>s.id==='sql')!.sdgs])].sort((a,b)=>a-b))})
})
