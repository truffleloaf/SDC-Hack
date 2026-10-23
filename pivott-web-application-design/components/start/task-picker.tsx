'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/pivott/confirm-dialog'
import { PButton } from '@/components/pivott/p-button'
import { ValueSlider } from '@/components/pivott/value-slider'
import { skills, tasksForRole } from '@/lib/data/seed'
import { addTask, removeTask, setShare } from '@/lib/shares'
import { getState, setState, type AppState } from '@/lib/store'

export function TaskPicker({ state }: { state: AppState }) {
  const [name, setName] = useState('')
  const [restoreOpen, setRestoreOpen] = useState(false)
  const [picked, setPicked] = useState<string[]>([])
  const tasks = [...tasksForRole(state.roleId!), ...state.customTasks]

  function remove(id: string) {
    const before = getState()
    const after = removeTask(before.selections, id)
    setState({ selections: after })
    toast('Task removed from your work', { action: { label: 'Undo', onClick: () => {
      // Restore only the removal when the task selection has not changed since.
      if (JSON.stringify(getState().selections) === JSON.stringify(after)) setState({ selections: before.selections })
      else toast('Your task list has changed. Add the task again below.')
    } } })
  }


  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">Time shares start with the template. Changing one automatically rebalances the others to keep the total at 100%. Renaming a reference task keeps its template estimate; add a custom task for different work.</p>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        {tasks.map((task) => {
          const selected = state.selections.find((item) => item.taskId === task.id)
          const title = state.taskNames[task.id] || task.name
          const custom = !('roleId' in task)
          return (
            <details key={task.id} className="border-b border-border last:border-0">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 px-4 py-3 font-medium focus-visible:rounded-sm">
                <span className="min-w-0 break-words">{title}</span>
                <span className="shrink-0 text-sm tabular-nums text-muted-foreground">{selected ? `${Math.round(selected.share)}%` : 'Not included'} <span aria-hidden>⌄</span></span>
              </summary>
              <div className="flex flex-col gap-4 px-4 pb-5">
                <label className="flex flex-col gap-1.5 text-sm">Task name
                  <input className="pivott-input" maxLength={60} value={state.taskNames[task.id] ?? task.name} onChange={(event) => setState({ taskNames: { ...state.taskNames, [task.id]: event.target.value } })} onBlur={() => !state.taskNames[task.id]?.trim() && setState({ taskNames: { ...state.taskNames, [task.id]: task.name } })} />
                </label>
                <p className="text-sm leading-relaxed text-muted-foreground">{'description' in task && typeof task.description === 'string' ? task.description : 'Not assessed yet. This task is included in your time allocation, without an exposure estimate.'}</p>
                <p className="text-xs text-muted-foreground">Skills: {task.skills.map((id) => skills.find((skill) => skill.id === id)?.name).join(', ') || 'Not specified'}</p>
                {selected ? <>
                  <label className="flex items-center justify-between gap-3 text-sm">Time spent (%)
                    <input className="pivott-input w-24" type="number" min={1} max={100} value={Math.round(selected.share)} aria-label={`Time percentage for ${title}`} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) setState({ selections: setShare(state.selections, task.id, Math.min(100, Math.max(1, value))) }) }} />
                  </label>
                  <ValueSlider label={`Time share for ${title}`} min={1} max={100} value={selected.share} onChange={(value) => setState({ selections: setShare(state.selections, task.id, value) })} />
                  <PButton size="sm" variant="ghost" className="self-start" onClick={() => remove(task.id)}>Remove task</PButton>
                </> : <PButton size="sm" variant="secondary" className="self-start" onClick={() => setState({ selections: addTask(state.selections, task.id) })}>Include task</PButton>}
                {custom && <p className="text-xs text-muted-foreground">A name or skill label alone does not support an AI exposure estimate.</p>}
              </div>
            </details>
          )
        })}
      </div>
      <details className="rounded-xl border border-border bg-card p-4">
        <summary className="cursor-pointer text-sm font-medium">Add your own task</summary>
        <form className="mt-4 flex flex-col gap-4" onSubmit={(event) => {
          event.preventDefault(); if (!name.trim()) return
          const id = `custom-${crypto.randomUUID()}`
          setState({ customTasks: [...state.customTasks, { id, name: name.trim().slice(0, 60), skills: picked }], selections: addTask(state.selections, id) })
          setName(''); setPicked([]); toast('Task added · Not assessed yet')
        }}>
          <label className="flex flex-col gap-2 text-sm">Task name<input className="pivott-input" value={name} onChange={(event) => setName(event.target.value)} maxLength={60} required /></label>
          <fieldset className="flex flex-col gap-2"><legend className="mb-2 text-sm">Skills it uses (optional)</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-2">{skills.map((skill) => <label key={skill.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={picked.includes(skill.id)} onChange={(event) => setPicked(event.target.checked ? [...picked, skill.id] : picked.filter((id) => id !== skill.id))} />{skill.name}</label>)}</div>
          </fieldset>
          <p className="text-xs text-muted-foreground">Custom tasks stay “Not assessed yet”; Pivott does not assign an estimated percentage to them.</p>
          <PButton size="sm" type="submit" className="self-start" disabled={!name.trim()}>Add task</PButton>
        </form>
      </details>
      <PButton variant="ghost" size="sm" className="self-start" onClick={() => setRestoreOpen(true)}>Restore defaults</PButton>
      <ConfirmDialog open={restoreOpen} onOpenChange={setRestoreOpen} title="Restore template tasks" description="Replace the selected tasks, names and time shares with the role defaults. Your custom task records and skill ratings will be kept." confirmLabel="Restore defaults" onConfirm={() => setState({ selections: tasksForRole(getState().roleId!).map((task) => ({ taskId: task.id, share: task.defaultShare })), taskNames: {} })} />
    </div>
  )
}
