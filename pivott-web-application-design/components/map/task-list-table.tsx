'use client'

import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { Fragment, useState } from 'react'
import { TaskDetailCard } from './task-map-canvas'
import { ClassificationBadge, ExposureBadge, SkillChip } from '@/components/pivott/badges'
import { taskById } from '@/lib/data/seed'
import type { ScoredTask } from '@/lib/engine'
import { cn } from '@/lib/utils'

type Key = 'name' | 'share' | 'exposure' | 'classification'

export function TaskListTable({ tasks, highlightIds = [] }: { tasks: ScoredTask[]; highlightIds?: string[] }) {
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: 'exposure', dir: -1 })
  const [openId, setOpenId] = useState<string | null>(null)

  const sorted = [...tasks].sort((a, b) => {
    const av = a[sort.key]
    const bv = b[sort.key]
    const c = typeof av === 'number' ? av - (bv as number) : String(av).localeCompare(String(bv))
    return c * sort.dir
  })

  const header = (key: Key, label: string, className?: string) => {
    const active = sort.key === key
    const Icon = !active ? ArrowUpDown : sort.dir === 1 ? ArrowUp : ArrowDown
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
        className={cn('px-4 py-3 text-left font-normal', className)}
      >
        <button
          type="button"
          onClick={() => setSort((s) => ({ key, dir: s.key === key ? ((-s.dir) as 1 | -1) : key === 'name' ? 1 : -1 }))}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-md font-sans text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          {label}
          <Icon className={cn('size-3.5', active ? 'text-primary' : 'text-faint')} aria-hidden />
        </button>
      </th>
    )
  }

  return (
    <div className="relative min-w-0 max-w-full overflow-x-auto rounded-2xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Your tasks with AI exposure and classification. Column headers are sortable.</caption>
        <thead className="border-b border-border bg-subtle">
          <tr>
            {header('name', 'Task')}
            {header('share', 'Assessed time')}
            {header('exposure', 'Exposure')}
            {header('classification', 'Class')}
            <th scope="col" className="px-4 py-3 text-left font-sans text-xs font-normal text-muted-foreground">
              Skills
            </th>
            <th scope="col" className="sr-only">Task details</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((t) => (
            <Fragment key={t.id}><tr
              className={cn(
                'border-b border-border bg-card transition-colors last:border-b-0 hover:bg-subtle/60',
                highlightIds.includes(t.id) && 'bg-mint/60',
              )}
            >
              <th scope="row" className="px-4 py-3.5 text-left font-medium">
                {t.name}
                {taskById[t.id] && taskById[t.id].name !== t.name && <span className="mt-1 block text-xs font-normal text-muted-foreground">Based on template: {taskById[t.id].name}</span>}
              </th>
              <td className="px-4 py-3.5 font-mono tabular-nums text-muted-foreground">{Math.round(t.share * 100)}%</td>
              <td className="px-4 py-3.5">
                <ExposureBadge value={t.exposure} />
              </td>
              <td className="px-4 py-3.5">
                <ClassificationBadge value={t.classification} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex flex-wrap gap-1">
                  {t.skills.map((s) => (
                    <SkillChip key={s} skillId={s} />
                  ))}
                </div>
              </td>
              <td className="px-3"><button className="min-h-11 text-sm text-primary" aria-expanded={openId === t.id} aria-controls={`details-${t.id}`} onClick={() => setOpenId(openId === t.id ? null : t.id)}>{openId === t.id ? 'Hide details' : 'Show details'}</button></td>
            </tr>
            {openId === t.id && <tr id={`details-${t.id}`}><td colSpan={6} className="border-b border-border bg-card p-3"><TaskDetailCard task={t} pinned={false} onClose={() => setOpenId(null)} surface="solid" /></td></tr>}</Fragment>
          ))}
        </tbody>
      </table>
    </div>
  )
}
