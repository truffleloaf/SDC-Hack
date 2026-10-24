import {describe,it,expect} from 'vitest'
import fs from 'node:fs'
import ts from 'typescript'
import {analyze,demoState} from './store'
import {analysisRequest} from './remote'
import {suggestFromResume,resumeProfilePatch} from './resume/match'
import {tasksForRole} from './data/seed'
describe('human decision inputs',()=>{
 it('never adds protected fields to exported scoring input types',()=>{
  const file=ts.createSourceFile('engine.ts',fs.readFileSync(new URL('./engine.ts',import.meta.url),'utf8'),ts.ScriptTarget.Latest,true)
  const banned=/^(age|gender|sex|ethnicity|race|nationality|maritalStatus|photo|name)$/
  for(const node of file.statements)if(ts.isInterfaceDeclaration(node)&&['ShareInput','CustomTask'].includes(node.name.text))for(const member of node.members)if(member.name&&ts.isIdentifier(member.name))expect(banned.test(member.name.text)&&member.name.text!=='name').toBe(false)
  expect(Object.keys(analysisRequest(demoState())).some(k=>banned.test(k))).toBe(false)
 })
 it('names and demographic-looking extra fields cannot change scores',()=>{const base=demoState();const changed={...base,name:'Different fixture name',age:62,gender:'fixture',nationality:'fixture'};expect(analyze(changed)).toEqual(analyze(base));expect(analysisRequest(changed)).toEqual(analysisRequest(base))})
 it('never stores demographic text from a synthetic résumé',()=>{
  const text='Synthetic Candidate\nAge: 62\nGender: fixture-gender\nNationality: fixture-nationality\nMarital status: fixture-marital\nPhoto: fixture-photo\nFinance administrator\nProcessed invoices and bank reconciliation\nExcel and SQL'
  const suggestions=suggestFromResume(text)
  expect(Object.keys(suggestions).sort()).toEqual(['roles','skills','tasks'])
  const base={...demoState(),mode:'personal' as const},roleId=base.roleId!,taskIds=tasksForRole(roleId).map(t=>t.id)
  const patch=resumeProfilePatch(base,{roleId,jobTitle:'Accounts assistant',taskIds,skillIds:suggestions.skills.map(s=>s.id)})
  const stored=JSON.stringify(patch)
  for(const forbidden of ['fixture-gender','fixture-nationality','fixture-marital','fixture-photo','Synthetic Candidate','Age: 62'])expect(stored).not.toContain(forbidden)
  expect(patch).not.toHaveProperty('text');expect(patch).not.toHaveProperty('skills')
 })
})
