export type Selection = { taskId: string; share: number }

const MIN = 1

function scaleOthers(list: Selection[], keepId: string, keepShare: number): Selection[] {
  const others = list.filter((s) => s.taskId !== keepId)
  const remaining = 100 - keepShare
  const total = others.reduce((a, b) => a + b.share, 0)
  return list.map((s) => {
    if (s.taskId === keepId) return { ...s, share: keepShare }
    const share = total > 0 ? (s.share / total) * remaining : remaining / others.length
    return { ...s, share }
  })
}

/** Sets one task’s share and rescales the others proportionally so the total stays 100. */
export function setShare(list: Selection[], taskId: string, value: number): Selection[] {
  if (list.length <= 1) return list.map((s) => ({ ...s, share: 100 }))
  const max = 100 - MIN * (list.length - 1)
  return scaleOthers(list, taskId, Math.min(max, Math.max(MIN, value)))
}

export function addTask(list: Selection[], taskId: string): Selection[] {
  if (list.some((s) => s.taskId === taskId)) return list
  const share = 100 / (list.length + 1)
  return scaleOthers([...list, { taskId, share }], taskId, share)
}

export function removeTask(list: Selection[], taskId: string): Selection[] {
  const rest = list.filter((s) => s.taskId !== taskId)
  const total = rest.reduce((a, b) => a + b.share, 0)
  return rest.map((s) => ({ ...s, share: total > 0 ? (s.share / total) * 100 : 100 / rest.length }))
}
