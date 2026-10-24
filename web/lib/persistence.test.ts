import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules() })
async function fixture() {
  vi.useFakeTimers(); vi.resetModules()
  const data = new Map<string, string>()
  const storage = { getItem: (key: string) => data.get(key) ?? null, setItem: vi.fn((key: string, value: string) => data.set(key, value)), removeItem: (key: string) => data.delete(key) }
  const handlers = new Map<string, () => void>()
  vi.stubGlobal('window', { localStorage: storage, addEventListener: (name: string, callback: () => void) => handlers.set(name, callback) })
  return { store: await import('./store'), storage, data, handlers }
}
describe('device persistence', () => {
  it('updates memory immediately and writes only the latest slider value after 150ms', async () => {
    const { store, storage, data } = await fixture()
    for (let hours = 1; hours <= 20; hours++) store.setState({ hoursPerWeek: hours })
    expect(store.getState().hoursPerWeek).toBe(20)
    expect(storage.setItem).not.toHaveBeenCalled()
    vi.advanceTimersByTime(150)
    expect(storage.setItem).toHaveBeenCalledTimes(1)
    expect(JSON.parse(data.get('pivott:v1')!).hoursPerWeek).toBe(20)
  })
  it('flushes on leaving the page and cancels pending writes after deletion', async () => {
    const { store, data, handlers } = await fixture()
    store.setState({ careerGoal: 'Review skills' }); handlers.get('pagehide')!()
    expect(JSON.parse(data.get('pivott:v1')!).careerGoal).toBe('Review skills')
    store.setState({ careerGoal: 'Pending' }); expect(store.clearAllData()).toBe(true)
    vi.advanceTimersByTime(200); expect(data.has('pivott:v1')).toBe(false)
  })
})
