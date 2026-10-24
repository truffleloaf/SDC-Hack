import type { PublicJob } from './jobs'

export const JOB_NOTIFICATIONS_KEY = 'pivott:job-notifications:v1'
export type WorkplacePreference = 'all' | 'remote' | 'location'
export type CheckInterval = 0 | 30 | 60 | 240

export interface JobAlertPreferences {
  enabled: boolean
  roleIds: string[]
  keywords: string
  location: string
  workplace: WorkplacePreference
  checkOnOpen: boolean
  intervalMinutes: CheckInterval
  browserNotifications: boolean
}

export interface JobNotice {
  id: string
  kind: 'new' | 'updated'
  job: PublicJob
  createdAt: string
  read: boolean
}

export interface JobNotificationState {
  version: 1
  preferences: JobAlertPreferences
  snapshots: Record<string, string>
  initialized: boolean
  notices: JobNotice[]
  lastCheckedAt: string | null
  matchingCount: number
}

export const defaultJobAlertPreferences: JobAlertPreferences = {
  enabled: false,
  roleIds: [],
  keywords: '',
  location: '',
  workplace: 'all',
  checkOnOpen: true,
  intervalMinutes: 60,
  browserNotifications: false,
}

export const initialJobNotificationState: JobNotificationState = {
  version: 1,
  preferences: defaultJobAlertPreferences,
  snapshots: {},
  initialized: false,
  notices: [],
  lastCheckedAt: null,
  matchingCount: 0,
}

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : ''
export function sanitizeJobAlertPreferences(value: Partial<JobAlertPreferences> | null | undefined): JobAlertPreferences {
  const interval = [0, 30, 60, 240].includes(Number(value?.intervalMinutes)) ? Number(value?.intervalMinutes) as CheckInterval : 60
  const workplace = ['all', 'remote', 'location'].includes(value?.workplace ?? '') ? value?.workplace as WorkplacePreference : 'all'
  return {
    enabled: value?.enabled === true,
    roleIds: Array.isArray(value?.roleIds) ? [...new Set(value.roleIds.filter(id => typeof id === 'string').map(id => id.slice(0, 80)))].slice(0, 50) : [],
    keywords: clean(value?.keywords, 120),
    location: clean(value?.location, 120),
    workplace,
    checkOnOpen: value?.checkOnOpen !== false,
    intervalMinutes: interval,
    browserNotifications: value?.browserNotifications === true,
  }
}

export function readJobNotificationState(raw: string | null): JobNotificationState {
  if (!raw) return initialJobNotificationState
  try {
    const parsed = JSON.parse(raw) as Partial<JobNotificationState>
    const snapshots = parsed.snapshots && typeof parsed.snapshots === 'object' && !Array.isArray(parsed.snapshots)
      ? Object.fromEntries(Object.entries(parsed.snapshots).filter(([id, value]) => id.length <= 200 && typeof value === 'string').slice(-1000))
      : {}
    const notices = Array.isArray(parsed.notices) ? parsed.notices.filter(isJobNotice).slice(0, 100) : []
    return { version:1, preferences:sanitizeJobAlertPreferences(parsed.preferences), snapshots, initialized:parsed.initialized === true, notices, lastCheckedAt:typeof parsed.lastCheckedAt === 'string' ? parsed.lastCheckedAt : null, matchingCount:Number.isInteger(parsed.matchingCount) && Number(parsed.matchingCount) >= 0 ? Number(parsed.matchingCount) : 0 }
  } catch { return initialJobNotificationState }
}

function isPublicJob(value: unknown): value is PublicJob {
  if (!value || typeof value !== 'object') return false
  const job = value as Partial<PublicJob>
  return typeof job.id === 'string' && typeof job.roleId === 'string' && typeof job.title === 'string' && typeof job.company === 'string' && typeof job.location === 'string' && typeof job.url === 'string' && /^https?:\/\//.test(job.url) && typeof job.postedAt === 'string' && typeof job.remote === 'boolean' && Array.isArray(job.tags) && job.tags.every(tag => typeof tag === 'string')
}

function isJobNotice(value: unknown): value is JobNotice {
  if (!value || typeof value !== 'object') return false
  const notice = value as Partial<JobNotice>
  return typeof notice.id === 'string' && (notice.kind === 'new' || notice.kind === 'updated') && typeof notice.createdAt === 'string' && typeof notice.read === 'boolean' && isPublicJob(notice.job)
}

export function filterAlertJobs(jobs: PublicJob[], preferences: JobAlertPreferences) {
  const location = preferences.location.toLowerCase().trim()
  const terms = preferences.keywords.toLowerCase().split(',').map(term => term.trim()).filter(Boolean)
  return jobs.filter(job => {
    if (preferences.roleIds.length && !preferences.roleIds.includes(job.roleId)) return false
    if (preferences.workplace === 'remote' && !job.remote) return false
    if (preferences.workplace === 'location' && job.remote) return false
    if (location && !job.location.toLowerCase().includes(location)) return false
    const searchable = [job.title, job.company, job.location, ...job.tags].join(' ').toLowerCase()
    return terms.length === 0 || terms.some(term => searchable.includes(term))
  })
}

export function jobFingerprint(job: PublicJob) {
  return JSON.stringify([job.title, job.company, job.location, job.postedAt, job.remote, [...job.tags].sort()])
}

export function alertFilterSignature(preferences: JobAlertPreferences) {
  return JSON.stringify([[...preferences.roleIds].sort(), preferences.keywords.toLowerCase().trim(), preferences.location.toLowerCase().trim(), preferences.workplace])
}

export function detectJobChanges(jobs: PublicJob[], previous: Record<string, string>, initialized: boolean, now = new Date().toISOString()) {
  const snapshots = { ...previous }
  const notices: JobNotice[] = []
  for (const job of jobs) {
    const fingerprint = jobFingerprint(job)
    const before = previous[job.id]
    snapshots[job.id] = fingerprint
    if (!initialized) continue
    const kind = !before ? 'new' : before !== fingerprint ? 'updated' : null
    if (kind) notices.push({ id:`${kind}:${job.id}:${fingerprint}`, kind, job, createdAt:now, read:false })
  }
  const bounded = Object.fromEntries(Object.entries(snapshots).slice(-1000))
  return { snapshots:bounded, notices }
}

export function dueForCheck(lastCheckedAt: string | null, intervalMinutes: CheckInterval, now = Date.now()) {
  if (intervalMinutes === 0) return false
  const previous = lastCheckedAt ? Date.parse(lastCheckedAt) : 0
  return !Number.isFinite(previous) || now - previous >= intervalMinutes * 60_000
}

export function parseJobApiPayload(payload: unknown): { asOf: string; postings: PublicJob[] } | null {
  if (!payload || typeof payload !== 'object') return null
  const value = payload as { asOf?: unknown; postings?: unknown }
  if (typeof value.asOf !== 'string' || !Array.isArray(value.postings) || !value.postings.every(isPublicJob)) return null
  return { asOf:value.asOf, postings:value.postings }
}
