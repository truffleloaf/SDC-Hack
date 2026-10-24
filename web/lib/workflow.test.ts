import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { CareerRoute } from '../components/landing/career-route'
import { getDemoJourney } from './demo'
import { analyze, demoState, displayName, emptyState, greetingName, possessive, sanitizeName, type AppState } from './store'
import { buildPathway } from './engine'
import { buildIcs } from './ics'
import { addTask, removeTask, setShare, setAdjacentShare } from './shares'
import { resources, skills, tasksForRole } from './data/seed'

describe('display name', () => {
  it('falls back to "there" in greetings when no name is set', () => {
    expect(greetingName({ name: '' })).toBe('there')
    expect(greetingName({ name: '   ' })).toBe('there')
    expect(greetingName({ name: 'Ravi' })).toBe('Ravi')
  })

  it('strips markup characters and control codes, and caps length', () => {
    expect(sanitizeName('<img src=x onerror=alert(1)>')).not.toMatch(/[<>]/)
    expect(sanitizeName('  Mei   Ling ').trim()).toBe('Mei Ling')
    expect(sanitizeName('Mei\nLing')).not.toMatch(/\n/)
    expect(sanitizeName('x'.repeat(100))).toHaveLength(40)
  })

  it('builds natural possessives', () => {
    expect(possessive('Ravi')).toBe('Ravi’s')
    expect(possessive('James')).toBe('James’')
    expect(possessive('')).toBe('Your')
    expect(displayName({ name: ' Ana ' })).toBe('Ana')
  })

  it('keeps the demo persona separate from a fresh personal profile', () => {
    expect(emptyState.mode).toBe('personal')
    expect(emptyState.name).toBe('')
    const demo = demoState()
    expect(demo.mode).toBe('demo')
    expect(demo.name).toBe('Aisyah')
  })
})

describe('task selection workflow', () => {
  const ids = tasksForRole('finance-admin').map((t) => t.id)
  const base = [
    { taskId: ids[0], share: 40 },
    { taskId: ids[1], share: 30 },
    { taskId: ids[2], share: 30 },
  ]
  const total = (l: { share: number }[]) => l.reduce((a, b) => a + b.share, 0)

  it('keeps shares normalised to 100% through add, adjust, and remove', () => {
    let list = addTask(base, ids[3])
    expect(total(list)).toBeCloseTo(100, 0)
    list = setShare(list, ids[0], 50)
    expect(total(list)).toBeCloseTo(100, 0)
    expect(list.find((s) => s.taskId === ids[0])!.share).toBeCloseTo(50, 0)
    list = removeTask(list, ids[1])
    expect(list).toHaveLength(3)
    expect(total(list)).toBeCloseTo(100, 0)
  })
})

describe('end-to-end journey (demo persona)', () => {
  const demo = demoState()

  it('uses the default top route in the landing illustration and demo destination', () => {
    const routes = analyze(demo).routes
    expect(getDemoJourney().destination.roleId).toBe(routes[0].roleId)
    expect(routes[0].title).toBe('Operations Coordinator')
    expect(renderToStaticMarkup(createElement(CareerRoute))).toContain(`Finance Admin to ${routes[0].title}`)
    expect(demo.targetRoleId ?? routes[0].roleId).toBe(getDemoJourney().destination.roleId)
    expect(getDemoJourney('fast').destination.title).toBe('Finance Systems Analyst')
  })

  it('produces a map, ranked routes, and a pathway from the same profile', () => {
    const result = analyze(demo)
    expect(result.scored.length).toBeGreaterThanOrEqual(5)
    expect(result.exposure).toBeGreaterThan(0)
    expect(result.exposure).toBeLessThan(1)
    expect(result.routes).toHaveLength(3)
    const scores = result.routes.map((r) => r.score)
    expect([...scores].sort((a, b) => b - a)).toEqual(scores)

    const pathway = buildPathway({ targetRoleId: result.routes[0].roleId, levels: demo.skills, hoursPerWeek: 6, freeOnly: false })
    expect(pathway.steps.length).toBe(result.routes[0].gaps.length)
    expect(pathway.weeks).toBe(Math.ceil(pathway.totalHours / 6))
  })

  it('genuinely recalculates when switching to the Fast scenario', () => {
    const normal = analyze(demo)
    const fast = analyze({ ...demo, scenario: 'fast' } as AppState)
    expect(fast.exposure).toBeGreaterThan(normal.exposure)
    for (const t of fast.scored) {
      const n = normal.scored.find((x) => x.id === t.id)!
      expect(t.exposure).toBeGreaterThanOrEqual(n.exposure)
    }
  })

  it('only links to stored resource URLs and respects the free-only filter', () => {
    const target = analyze(demo).routes[0].roleId
    const known = new Set(resources.map((r) => r.url))
    const free = buildPathway({ targetRoleId: target, levels: demo.skills, hoursPerWeek: 6, freeOnly: true })
    for (const step of free.steps) {
      if (step.resource) {
        expect(known.has(step.resource.url)).toBe(true)
        expect(step.resource.free).toBe(true)
      }
    }
  })

  it('more weekly hours never lengthens the plan', () => {
    const target = analyze(demo).routes[0].roleId
    const slow = buildPathway({ targetRoleId: target, levels: demo.skills, hoursPerWeek: 3, freeOnly: false })
    const quick = buildPathway({ targetRoleId: target, levels: demo.skills, hoursPerWeek: 12, freeOnly: false })
    expect(quick.weeks).toBeLessThanOrEqual(slow.weeks)
  })

  it('exports a valid calendar file with one event per step', () => {
    const target = analyze(demo).routes[0]
    const { steps } = buildPathway({ targetRoleId: target.roleId, levels: demo.skills, hoursPerWeek: 6, freeOnly: false })
    const ics = buildIcs(steps, target.title, new Date('2026-10-26T00:00:00Z'))
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true)
    expect(ics.trim().endsWith('END:VCALENDAR')).toBe(true)
    expect(ics.match(/BEGIN:VEVENT/g)?.length).toBe(steps.length)
  })
})


describe('free resource coverage', () => {
  it.each(skills)('provides a free resource for $name', (skill) => {
    expect(resources.some((resource) => resource.skillId === skill.id && resource.free)).toBe(true)
  })
})


describe('adjacent time editing', () => {
  const before = [{ taskId: 'a', share: 30 }, { taskId: 'b', share: 40 }, { taskId: 'c', share: 30 }]
  it('preserves the pair total and unrelated task while clamping at the boundary', () => {
    const moved = setAdjacentShare(before, 'a', 'b', 35)
    expect(moved.map((item) => item.share)).toEqual([35, 35, 30])
    expect(setAdjacentShare(before, 'a', 'b', 100).map((item) => item.share)).toEqual([69, 1, 30])
    expect(before.map((item) => item.share)).toEqual([30, 40, 30])
    expect(setAdjacentShare(before, 'a', 'missing', 10)).toBe(before)
  })
})
