import { describe, expect, it } from 'vitest'
import { alertFilterSignature, defaultJobAlertPreferences, detectJobChanges, dueForCheck, filterAlertJobs, jobFingerprint, readJobNotificationState } from './job-notifications'
import type { PublicJob } from './jobs'

const jobs: PublicJob[] = [
  { id:'one', roleId:'software-developer', title:'Software Engineer', company:'A', location:'Kuala Lumpur, Malaysia', url:'https://example.invalid/one', postedAt:'2026-10-24', remote:true, tags:['TypeScript'] },
  { id:'two', roleId:'chemist', title:'Laboratory Chemist', company:'B', location:'Penang, Malaysia', url:'https://example.invalid/two', postedAt:'2026-10-23', remote:false, tags:['Research'] },
]

describe('job notification matching', () => {
  it('combines roles, keywords, location and workplace preferences', () => {
    expect(filterAlertJobs(jobs, { ...defaultJobAlertPreferences, roleIds:['software-developer'], keywords:'python, typescript', location:'Malaysia', workplace:'remote' }).map(job => job.id)).toEqual(['one'])
    expect(filterAlertJobs(jobs, { ...defaultJobAlertPreferences, workplace:'location' }).map(job => job.id)).toEqual(['two'])
  })
  it('creates a quiet baseline, then reports only new and changed listings', () => {
    const baseline = detectJobChanges(jobs, {}, false, '2026-10-24T01:00:00.000Z')
    expect(baseline.notices).toEqual([])
    const changed = [{ ...jobs[0], location:'Johor Bahru, Malaysia' }, jobs[1], { ...jobs[1], id:'three', url:'https://example.invalid/three' }]
    const result = detectJobChanges(changed, baseline.snapshots, true, '2026-10-24T02:00:00.000Z')
    expect(result.notices.map(notice => [notice.job.id, notice.kind])).toEqual([['one','updated'],['three','new']])
    expect(result.snapshots.one).toBe(jobFingerprint(changed[0]))
  })
  it('sanitizes stored data and compares only matching filters for reset decisions', () => {
    expect(readJobNotificationState('{bad json')).toMatchObject({ initialized:false, notices:[] })
    expect(readJobNotificationState(JSON.stringify({ preferences:{ enabled:true, intervalMinutes:999 }, matchingCount:-1 }))).toMatchObject({ preferences:{ enabled:true, intervalMinutes:60 }, matchingCount:0 })
    expect(alertFilterSignature({ ...defaultJobAlertPreferences, intervalMinutes:30 })).toBe(alertFilterSignature({ ...defaultJobAlertPreferences, intervalMinutes:240 }))
  })
  it('checks only when the selected interval is due', () => {
    const now = Date.parse('2026-10-24T02:00:00.000Z')
    expect(dueForCheck('2026-10-24T01:00:00.000Z', 60, now)).toBe(true)
    expect(dueForCheck('2026-10-24T01:31:00.000Z', 60, now)).toBe(false)
    expect(dueForCheck(null, 0, now)).toBe(false)
  })
})
