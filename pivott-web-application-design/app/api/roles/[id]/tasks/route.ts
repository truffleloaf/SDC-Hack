import { allSignals, json } from '@/lib/api'
import { roleById, tasksForRole } from '@/lib/data/seed'
import { roleExposure, scoreTasks } from '@/lib/engine'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const role = roleById[id]
  if (!role) return json({ error: 'Role not found' }, 404)
  const scenario = new URL(req.url).searchParams.get('scenario') === 'fast' ? 'fast' : 'normal'
  const list = tasksForRole(id)
  const tasks = scoreTasks(
    list.map((t) => ({ taskId: t.id, share: t.defaultShare })),
    Object.fromEntries(list.map((t) => [t.id, t])),
    scenario,
    allSignals(),
  )
  return json({ role, scenario, roleExposure: roleExposure(tasks), tasks })
}
