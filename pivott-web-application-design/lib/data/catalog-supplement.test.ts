import { describe, expect, it } from 'vitest'
import live from './live-seed.json'
import { addCatalogSupplement } from './catalog-supplement'
import type { CatalogPayload } from './seed'

describe('expanded occupation catalogue', () => {
  it('adds sourced engineering, science, health and design roles with valid task and skill references', () => {
    const catalog = addCatalogSupplement(live as unknown as CatalogPayload)
    expect(catalog.roles).toHaveLength(20)
    expect(catalog.roles.find(role => role.id === 'software-developer')?.family).toBe('Engineering & Technology')
    expect(catalog.roles.find(role => role.id === 'environmental-scientist')?.family).toBe('Science & Research')
    const roleIds = new Set(catalog.roles.map(role => role.id))
    const skillIds = new Set(catalog.skills.map(skill => skill.id))
    expect(catalog.tasks.every(task => roleIds.has(task.roleId) && task.skills.every(skill => skillIds.has(skill)))).toBe(true)
    expect(catalog.roles.every(role => role.requirements.every(requirement => skillIds.has(requirement.skillId)))).toBe(true)
  })
})
