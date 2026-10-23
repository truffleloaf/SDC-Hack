import { readAccountProfile } from './account-data'
import type { AppState } from './store'

export type SavedProfile = { profile: AppState; revision: number; updated_at: string }
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered)
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, ordered(item)]))
  return value
}
export function profileContent(profile: AppState) {
  const { updatedAt: _time, recentlyChanged: _changes, ...content } = profile
  return JSON.stringify(ordered(content))
}
export function hasWork(profile: AppState) { return !!(profile.roleId || profile.selections.length || profile.name.trim() || profile.jobTitle.trim() || profile.careerGoal.trim() || Object.keys(profile.skills).length) }
export function syncDecision(device: AppState, account: SavedProfile | null): 'wait' | 'upload' | 'load' | 'compare' | 'same' | 'empty' {
  if (device.mode === 'demo') return 'wait'
  if (!account) return hasWork(device) ? 'upload' : 'empty'
  if (profileContent(device) === profileContent(account.profile)) return 'same'
  if (!hasWork(device)) return 'load'
  if (!hasWork(account.profile)) return 'upload'
  return 'compare'
}
export const BACKUP_KEY = 'pivott:v1:backup'
export interface ProfileBackup { version: 1; id: string; owner: string | null; side: 'device' | 'account'; profile: AppState | null; expiresAt: number; revision?: number }
export function createBackup(storage: Pick<Storage, 'setItem'>, input: Omit<ProfileBackup, 'version' | 'id' | 'expiresAt'>, now = Date.now()): ProfileBackup {
  const backup: ProfileBackup = { ...input, version: 1, id: crypto.randomUUID(), expiresAt: now + 30000 }
  storage.setItem(BACKUP_KEY, JSON.stringify(backup))
  return backup
}
export function readBackup(storage: Pick<Storage, 'getItem'>, owner: string | null, now = Date.now()): ProfileBackup | null {
  try {
    const value = JSON.parse(storage.getItem(BACKUP_KEY) || 'null')
    if (!value || value.version !== 1 || typeof value.id !== 'string' || value.owner !== owner || (value.side !== 'device' && value.side !== 'account') || !Number.isFinite(value.expiresAt) || value.expiresAt <= now || value.expiresAt > now + 30000 || (value.revision !== undefined && (!Number.isSafeInteger(value.revision) || value.revision < 1))) return null
    return { ...value, profile: value.profile === null ? null : readAccountProfile(value.profile) }
  } catch { return null }
}
