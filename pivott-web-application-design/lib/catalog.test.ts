import { afterEach, describe, expect, it } from 'vitest'
import { getCatalog } from './catalog'
import liveSeed from './data/live-seed.json'
import {
  applyCatalog,
  catalogSource,
  hasDemoPersona,
  resetCatalog,
  roleById,
  taskById,
  type CatalogPayload,
} from './data/seed'

const payload: CatalogPayload = {
  version: 'test-live',
  asOf: '2026-10-23',
  roles: [{
    id: 'live-role',
    title: 'Live Role',
    family: 'Test',
    demand: 50,
    requirements: [{ skillId: 'live-skill', requiredLevel: 2, importance: 3 }],
    sdgs: [8],
  }],
  tasks: [{
    id: 'live-task',
    roleId: 'live-role',
    name: 'Live task',
    description: 'A task from the live catalogue.',
    baseExposure: 0.5,
    humanJudgment: 0.5,
    defaultShare: 100,
    skills: ['live-skill'],
    tryThisWeek: 'Try it.',
  }],
  skills: [{
    id: 'live-skill',
    name: 'Live skill',
    category: 'Technical',
    hoursPerLevel: 8, sdgs: [4],
    deliverable: 'A live deliverable',
  }],
  signals: [],
  resources: [],
  scenarios: [{ id: 'normal', label: 'Normal', multiplier: 1, description: 'Normal' }],
  sdgs: [{ id: 8, name: 'Decent Work', color: '#000000' }],
  demoPersona: null,
}

afterEach(() => resetCatalog())

describe('catalogue overlay', () => {
  it('applies a live payload and restores the demo seed', () => {
    expect(applyCatalog(payload)).toBe(true)
    expect(catalogSource).toBe('live')
    expect(hasDemoPersona).toBe(false)
    expect(roleById['live-role']?.title).toBe('Live Role')
    expect(taskById['live-task']?.name).toBe('Live task')

    expect(applyCatalog(payload)).toBe(false)

    resetCatalog()
    expect(catalogSource).toBe('demo')
    expect(hasDemoPersona).toBe(true)
    expect(roleById['finance-admin']?.title).toBe('Finance Admin')
  })

  it('never reaches the network during unit tests', async () => {
    await getCatalog()
    expect(catalogSource).toBe('demo')
    expect(hasDemoPersona).toBe(true)
  })

  it('ships a live O*NET snapshot for the code-only deployment', () => {
    expect(liveSeed.roles).toHaveLength(10)
    expect(liveSeed.tasks).toHaveLength(60)
    expect(liveSeed.skills).toHaveLength(17)
    expect(liveSeed.demoPersona).toBeNull()
  })
})