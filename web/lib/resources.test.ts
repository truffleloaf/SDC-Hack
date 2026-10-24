import {describe,it,expect} from 'vitest'
import resources from './data/resources.live.json'
import {buildPathway} from './engine'
import {demoPersona,roleById} from './data/seed'
describe('pathway provenance',()=>{
 it('accepts only vetted public resource metadata',()=>{for(const r of resources as {url:string;verifiedAt:string;hrdCorp?:boolean;claimSource?:string}[]){expect(r.url).toMatch(/^https:\/\//);expect(r.verifiedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);if(r.hrdCorp)expect(r.claimSource).toMatch(/^https:\/\//)}})
 it('explains priority from the actual gap and catalogue weight',()=>{const role=roleById['finance-systems-analyst'];const plan=buildPathway({targetRoleId:role.id,levels:demoPersona.skills,hoursPerWeek:6,freeOnly:true});for(const step of plan.steps){expect(step.priority).toBeCloseTo((step.required-step.current)*step.importance*role.demand/100);expect(step.resource?.free ?? true).toBe(true)}})
})
