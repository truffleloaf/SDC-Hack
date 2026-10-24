import { describe, expect, it } from 'vitest'
import { zipSync, strToU8 } from 'fflate'
import { suggestFromResume, resumeProfilePatch } from './match'
import { docxDocumentXml, readableResumeText, validateResumeFile, MAX_RESUME_BYTES } from './files'
import { emptyState, demoState, parseStored, type AppState } from '../store'
import { readAccountProfile } from '../account-data'

const finance = `Accounts Executive | Northwind | 2022–present
Processed invoices and managed supplier invoices in SAP.
Bank reconciliation and month-end reporting using Excel.
Reviewed expense claims and answered payment queries.
Skills: SQL, stakeholder communication.`

describe('résumé catalogue matching', () => {
  it('suggests work with reviewable source evidence without creating skill levels', () => {
    const result = suggestFromResume(finance)
    expect(result.roles[0].id).toBe('finance-admin')
    expect(result.roles[0].excerpt).toContain('Accounts Executive')
    expect(result.tasks.map((item) => item.id)).toEqual(expect.arrayContaining(['fa-invoice', 'fa-recon', 'fa-reporting', 'fa-expense', 'fa-comms']))
    expect(result.skills.map((item) => item.id)).toEqual(expect.arrayContaining(['excel', 'erp', 'sql', 'stakeholder']))
    expect(JSON.stringify(result)).not.toContain('requiredLevel')
  })
  it('matches phrases across punctuation, case and common aliases', () => {
    const result = suggestFromResume('DATA ANALYST\nBuilt Power-BI dashboards and wrote SQL queries.\nData cleaning in Python and statistical analysis.')
    expect(result.roles[0].id).toBe('data-analyst')
    expect(result.tasks.map((item) => item.id)).toEqual(expect.arrayContaining(['da-clean', 'da-query', 'da-dashboards']))
    expect(result.skills.map((item) => item.id)).toEqual(expect.arrayContaining(['bi', 'sql', 'python', 'stats']))
  })
  it('avoids substring and explicitly negated skill claims', () => {
    const result = suggestFromResume('No experience with Python or SQL.\nNoSQL developer.\nI want to learn Tableau.\nUsed Excel for routine reconciliations.')
    expect(result.skills.map((item) => item.id)).toEqual(['excel'])
  })
  it('leaves work outside the catalogue unmatched rather than inventing a role', () => {
    expect(suggestFromResume('Landscape gardener\nPlanting trees, maintaining lawns and designing gardens.')).toEqual({ roles: [], tasks: [], skills: [] })
  })
  it('can suggest a reference from multiple specific tasks while retaining the evidence', () => {
    expect(suggestFromResume('Built dashboards for the business.\nData cleaning for weekly reports.').roles[0].id).toBe('data-analyst')
  })
})

describe('confirmed import boundary', () => {
  const current: AppState = { ...emptyState, roleId: 'finance-admin', name: 'My name', skills: { excel: 0 }, savedRouteIds: ['data-analyst'], targetRoleId: 'data-analyst', completedSteps: ['data-analyst:sql'], customTasks: [{ id: 'custom-one', name: 'Personal work', skills: [] }], careerGoal: 'Explore operations' }
  const selection = { roleId: 'data-analyst', jobTitle: ' Analyst ', taskIds: ['da-query', 'da-clean', 'fa-invoice'], skillIds: ['sql', 'python', 'not-a-skill', 'sql'] }
  it('only replaces confirmed work, resets the active plan and keeps zero/unknown ratings intact', () => {
    const patch = resumeProfilePatch(current, selection)
    const applied = { ...current, ...patch }
    expect(applied.skills).toEqual({ excel: 0 })
    expect(applied.skills.sql).toBeUndefined()
    expect(applied.customTasks).toEqual(current.customTasks)
    expect(applied.savedRouteIds).toEqual(['data-analyst'])
    expect(applied.careerGoal).toBe('Explore operations')
    expect(applied.name).toBe('My name')
    expect(applied.selections.map((item) => item.taskId)).toEqual(['da-clean', 'da-query'])
    expect(applied.selections.reduce((sum, item) => sum + item.share, 0)).toBeCloseTo(100)
    expect(applied.targetRoleId).toBeNull()
    expect(applied.completedSteps).toEqual([])
    expect(applied.resumeSkillIds).toEqual(['sql', 'python'])
    expect(applied.jobTitle).toBe('Analyst')
    expect(Object.keys(patch).sort()).toEqual(['completedSteps', 'jobTitle', 'recentlyChanged', 'resumeSkillIds', 'roleId', 'selections', 'targetRoleId', 'taskNames'].sort())
  })
  it('rejects empty selections, unknown roles and import into the isolated demo', () => {
    expect(() => resumeProfilePatch(current, { ...selection, taskIds: [] })).toThrow('Select at least one')
    expect(() => resumeProfilePatch(current, { ...selection, roleId: 'unknown' })).toThrow('Choose a reference')
    expect(() => resumeProfilePatch(demoState(), selection)).toThrow('Exit the example')
    expect(current.skills.excel).toBe(0)
  })
  it('supports old profiles and safely round-trips confirmed skill IDs through account data', () => {
    const old = { ...current } as Partial<typeof current>
    delete old.resumeSkillIds
    expect(parseStored(JSON.stringify(old)).resumeSkillIds).toEqual([])
    expect(parseStored(JSON.stringify({ ...old, resumeSkillIds: null })).resumeSkillIds).toEqual([])
    expect(parseStored(JSON.stringify({ ...old, resumeSkillIds: ['sql', 'unknown', 'sql'] })).resumeSkillIds).toEqual(['sql'])
    const restored = readAccountProfile({ ...current, resumeSkillIds: ['sql', 'unknown', 'sql'] })
    expect(restored.resumeSkillIds).toEqual(['sql'])
    expect(restored.skills).toEqual({ excel: 0 })
  })
})

describe('local file boundaries', () => {
  it('accepts supported extensions and rejects empty, oversized and older Word files', () => {
    expect(validateResumeFile({ name: 'Resume.PDF', size: 100 })).toBe('pdf')
    expect(validateResumeFile({ name: 'Resume.docx', size: 100 })).toBe('docx')
    for (const file of [{ name: 'resume.doc', size: 100 }, { name: 'resume.pdf.exe', size: 100 }, { name: 'resume.pdf', size: 0 }, { name: 'resume.pdf', size: MAX_RESUME_BYTES + 1 }]) expect(() => validateResumeFile(file)).toThrow()
  })
  it('extracts only the main DOCX XML, ignoring other archive contents', () => {
    const xml = '<w:document xmlns:w="urn:word"><w:p><w:r><w:t>Accounts Executive</w:t></w:r></w:p></w:document>'
    expect(docxDocumentXml(zipSync({ 'word/document.xml': strToU8(xml), 'word/media/image.png': new Uint8Array(1000) }))).toBe(xml)
  })
  it('rejects non-documents, oversized XML and declarations instead of interpreting them', () => {
    expect(() => docxDocumentXml(strToU8('not a zip'))).toThrow()
    expect(() => docxDocumentXml(zipSync({ 'other.xml': strToU8('no document') }))).toThrow()
    expect(() => docxDocumentXml(zipSync({ 'word/document.xml': strToU8('<!DOCTYPE example><document/>') }))).toThrow('unsupported XML')
    expect(() => docxDocumentXml(zipSync({ 'word/document.xml': new Uint8Array(2 * 1024 * 1024 + 1) }))).toThrow('too large')
  })
  it('explains scanned/empty files and limits excessive extracted text', () => {
    expect(() => readableResumeText('   ')).toThrow('Image-only scans need OCR')
    expect(() => readableResumeText('x'.repeat(100001))).toThrow('too much text')
    expect(readableResumeText(finance)).toBe(finance)
  })
})
