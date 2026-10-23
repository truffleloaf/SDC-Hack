import { describe, expect, it } from 'vitest'
import { BACKUP_KEY, createBackup, expireBackup, profileContent, readBackup, syncDecision } from './account-sync'
import { emptyState, demoState } from './store'
import { readAccountProfile } from './account-data'
const profile = { ...emptyState, roleId: 'finance-admin', skills: { excel: 0 }, selections: [{ taskId: 'fa-invoice', share: 100 }] }
const row = { profile, revision: 2, updated_at: '2026-10-23T00:00:00Z' }
describe('first-sync decisions', () => {
  it('uploads device work to an empty account', () => expect(syncDecision(profile, null)).toBe('upload'))
  it('loads account work onto an untouched device', () => expect(syncDecision(emptyState, row)).toBe('load'))
  it('compares two different profiles without merging ratings', () => {
    expect(syncDecision({ ...profile, skills: { excel: 3 } }, row)).toBe('compare')
    expect(row.profile.skills.excel).toBe(0)
  })
  it('recognises equal content regardless of timestamps, transient highlights or object key order', () => {
    const other = { ...profile, updatedAt: '2026-10-22T00:00:00Z', recentlyChanged: [{ taskId: 'fa-invoice', before: 0.5, after: 0.6 }] }
    expect(syncDecision(other, row)).toBe('same')
    expect(profileContent({ ...profile, skills: { excel: 0, sql: 1 } })).toBe(profileContent({ ...profile, skills: { sql: 1, excel: 0 } }))
    expect(syncDecision(demoState(), row)).toBe('wait'); expect(syncDecision(emptyState, null)).toBe('empty')
  })
})
describe('replacement recovery', () => {
  it('stores the replaced device/account version for only its owner and 30 seconds', () => {
    const data = new Map<string, string>(), storage = { setItem: (key: string, value: string) => { data.set(key, value) }, getItem: (key: string) => data.get(key) ?? null }
    for (const side of ['device', 'account'] as const) {
      const written = createBackup(storage, { owner: 'owner-a', side, profile, revision: 3 }, 1000)
      expect(data.has(BACKUP_KEY)).toBe(true); expect(written.expiresAt).toBe(31000)
      expect(readBackup(storage, 'owner-a', 2000)?.profile?.skills.excel).toBe(0)
      expect(readBackup(storage, 'owner-b', 2000)).toBeNull(); expect(readBackup(storage, 'owner-a', 31000)).toBeNull()
      const restored = readBackup(storage, 'owner-a', 2000)!.profile!
      expect(profileContent(restored)).toBe(profileContent(profile))
    }
  })
  it('purges expired recovery data when returning to the app', () => { const data = new Map([[BACKUP_KEY, JSON.stringify({ id: 'backup', expiresAt: 31000 })]]); const storage = { getItem: (key: string) => data.get(key) ?? null, removeItem: (key: string) => { data.delete(key) } }; expect(expireBackup(storage, 1000)?.remaining).toBe(30000); expect(expireBackup(storage, 31000)).toBeNull(); expect(data.size).toBe(0) })
  it('fails before replacement when a backup cannot be written', () => {
    expect(() => createBackup({ setItem: () => { throw new Error('quota') } }, { owner: null, side: 'device', profile })).toThrow('quota')
  })
  it('validates imported data and drops unknown fields', () => {
    expect(readAccountProfile({ ...profile, secretExtraField: 'not part of a profile' })).not.toHaveProperty('secretExtraField')
    expect(() => readAccountProfile({ ...profile, freeOnly: 'yes' })).toThrow('invalid preferences')
  })
})
