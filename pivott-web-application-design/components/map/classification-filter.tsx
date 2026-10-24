import type { Classification, ScoredTask } from '@/lib/engine'
import { cn } from '@/lib/utils'
export type ClassFilter = 'All' | Classification
const types: ClassFilter[] = ['All', 'Automate', 'Augment', 'Protect']
export function ClassificationFilter({ tasks, value, onChange }: { tasks: ScoredTask[]; value: ClassFilter; onChange: (value: ClassFilter) => void }) {
  return <div role="group" aria-label="Filter tasks by classification" className="flex flex-wrap gap-2">{types.map((type) => <button key={type} type="button" aria-pressed={value === type} onClick={() => onChange(type)} className={cn('inline-flex min-h-11 items-center gap-2 rounded-full border px-3 text-xs', value === type ? 'border-primary bg-mint text-accent-foreground' : 'border-border-strong text-muted-foreground')}>
    {type !== 'All' && <span aria-hidden className={cn('size-2.5 rounded-full', type === 'Automate' ? 'bg-exp-high' : type === 'Augment' ? 'bg-exp-mid' : 'bg-exp-low')} />}{type === 'All' ? 'All tasks' : type} ({type === 'All' ? tasks.length : tasks.filter((task) => task.classification === type).length})
  </button>)}</div>
}
