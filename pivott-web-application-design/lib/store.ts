'use client'

import { useMemo, useSyncExternalStore } from 'react'
import { demoPersona, signals as seedSignals, tasksForRole, taskById, type Signal } from './data/seed'
import {
  computeRoutes,
  roleExposure,
  scoreTasks,
  type CustomTask,
  type ScenarioId,
} from './engine'

export type ProfileMode = 'personal' | 'demo'

export interface AppState {
  version: 1
  mode: ProfileMode
  name: string
  roleId: string | null
  selections: { taskId: string; share: number }[]
  customTasks: CustomTask[]
  skills: Record<string, number>
  scenario: ScenarioId
  targetRoleId: string | null
  hoursPerWeek: number
  freeOnly: boolean
  completedSteps: string[]
  customSignals: Signal[]
  appliedSignalIds: string[]
  recentlyChanged: { taskId: string; before: number; after: number }[]
}

const STORAGE_KEY = 'pivott:v1'
const PERSONAL_KEY = 'pivott:v1:personal'
export const NAME_MAX = 40

export const emptyState: AppState = {
  version: 1,
  mode: 'personal',
  name: '',
  roleId: null,
  selections: [],
  customTasks: [],
  skills: {},
  scenario: 'normal',
  targetRoleId: null,
  hoursPerWeek: 6,
  freeOnly: false,
  completedSteps: [],
  customSignals: [],
  appliedSignalIds: [],
  recentlyChanged: [],
}

export function demoState(): AppState {
  return {
    ...emptyState,
    mode: 'demo',
    name: demoPersona.name,
    roleId: demoPersona.roleId,
    selections: tasksForRole(demoPersona.roleId).map((t) => ({ taskId: t.id, share: t.defaultShare })),
    skills: { ...demoPersona.skills },
  }
}

let state: AppState = emptyState
let loaded = false
const listeners = new Set<() => void>()

function load() {
  if (loaded || typeof window === 'undefined') return
  loaded = true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw) state = parseStored(raw)
  } catch {
    state = emptyState
  }
}

function parseStored(raw: string): AppState {
  const parsed = JSON.parse(raw) as Partial<AppState>
  const legacyDemo = !parsed.mode && parsed.name === demoPersona.name && parsed.roleId === demoPersona.roleId
  return {
    ...emptyState,
    ...parsed,
    mode: parsed.mode === 'demo' || legacyDemo ? 'demo' : 'personal',
    name: sanitizeName(typeof parsed.name === 'string' ? parsed.name : ''),
  }
}

/** Strips control characters and angle brackets, collapses whitespace, and caps length. Rendered as text by React either way. */
export function sanitizeName(raw: string) {
  return raw
    .replace(/[\u0000-\u001F\u007F<>]/g, '')
    .replace(/\s+/g, ' ')
    .replace(/^\s+/, '')
    .slice(0, NAME_MAX)
}

export function displayName(s: Pick<AppState, 'name'>) {
  return s.name.trim()
}

export function greetingName(s: Pick<AppState, 'name'>) {
  return displayName(s) || 'there'
}

export function possessive(name: string, fallback = 'Your') {
  if (!name) return fallback
  return /s$/i.test(name) ? `${name}’` : `${name}’s`
}

export function setDisplayName(raw: string) {
  setState({ name: sanitizeName(raw) })
}

export function getState() {
  load()
  return state
}

/** Loads the demo persona, stashing the personal profile so it can be restored untouched. */
export function enterDemo() {
  load()
  if (state.mode !== 'demo') {
    try {
      window.localStorage.setItem(PERSONAL_KEY, JSON.stringify(state))
    } catch {}
  }
  replaceState(demoState())
}

export function exitDemo() {
  let personal: AppState = emptyState
  try {
    const raw = window.localStorage.getItem(PERSONAL_KEY)
    if (raw) personal = { ...parseStored(raw), mode: 'personal' }
    window.localStorage.removeItem(PERSONAL_KEY)
  } catch {}
  replaceState(personal)
}

function emit() {
  for (const l of listeners) l()
}

export function setState(next: Partial<AppState> | ((s: AppState) => Partial<AppState>)) {
  load()
  const patch = typeof next === 'function' ? next(state) : next
  state = { ...state, ...patch }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
  emit()
}

export function replaceState(next: AppState) {
  loaded = true
  state = next
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {}
  emit()
}

export function clearAllData() {
  try {
    window.localStorage.removeItem(STORAGE_KEY)
    window.localStorage.removeItem(PERSONAL_KEY)
  } catch {}
  loaded = true
  state = emptyState
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      loaded = false
      load()
      l()
    }
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(l)
    window.removeEventListener('storage', onStorage)
  }
}

const serverSnapshot = { state: emptyState, hydrated: false }
let clientSnapshot = { state, hydrated: true }

function getSnapshot() {
  load()
  if (clientSnapshot.state !== state) clientSnapshot = { state, hydrated: true }
  return clientSnapshot
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot)
}

export function activeSignals(s: AppState): Signal[] {
  return [...seedSignals, ...s.customSignals.filter((c) => s.appliedSignalIds.includes(c.id))]
}

export function taskLookup(s: AppState) {
  return { ...taskById, ...Object.fromEntries(s.customTasks.map((t) => [t.id, t])) }
}

export function computeScored(s: AppState, scenario: ScenarioId = s.scenario, signals = activeSignals(s)) {
  return scoreTasks(s.selections, taskLookup(s), scenario, signals)
}

export function useAnalysis(s: AppState) {
  return useMemo(() => analyze(s), [s])
}

export function analyze(s: AppState) {
  const signals = activeSignals(s)
  const scored = scoreTasks(s.selections, taskLookup(s), s.scenario, signals)
  const exposure = roleExposure(scored)
  const userTaskSkills = [...new Set(scored.flatMap((t) => t.skills))]
  const routes = s.roleId
    ? computeRoutes({
        currentRoleId: s.roleId,
        userTaskSkills,
        levels: s.skills,
        scenarioId: s.scenario,
        signals,
        hoursPerWeek: s.hoursPerWeek,
      })
    : []
  const lastUpdated = signals.reduce((a, b) => (b.date > a ? b.date : a), '2000-01-01')
  return { signals, scored, exposure, routes, userTaskSkills, lastUpdated }
}
