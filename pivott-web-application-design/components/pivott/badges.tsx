import { Bot, ShieldCheck, Sparkles, TrendingDown, TrendingUp, BadgeCheck, FlaskConical, UserPen } from 'lucide-react'
import { skillById, sdgs } from '@/lib/data/seed'
import { exposureBand, exposureColor, type Classification } from '@/lib/engine'
import { cn } from '@/lib/utils'

export function ExposureBadge({ value, className, showBand = true }: { value: number; className?: string; showBand?: boolean }) {
  const band = exposureBand(value)
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-xs font-medium text-exp-ink',
        className,
      )}
      style={{ backgroundColor: exposureColor(value) }}
    >
      {Math.round(value * 100)}%{showBand && <span className="font-sans font-normal opacity-75">{band}</span>}
    </span>
  )
}

const classMeta: Record<Classification, { icon: typeof Bot; label: string; className: string; hint: string }> = {
  Automate: {
    icon: Bot,
    label: 'Automate',
    className: 'bg-exp-high/35 text-foreground border-exp-high/70',
    hint: 'AI could handle much of this task.',
  },
  Augment: {
    icon: Sparkles,
    label: 'Augment',
    className: 'bg-exp-mid/40 text-foreground border-exp-mid',
    hint: 'AI can assist while you stay in charge.',
  },
  Protect: {
    icon: ShieldCheck,
    label: 'Protect',
    className: 'bg-mint text-accent-foreground border-teal/40',
    hint: 'Relies on human judgment.',
  },
}

export function ClassificationBadge({ value, className }: { value: Classification; className?: string }) {
  const m = classMeta[value]
  const Icon = m.icon
  return (
    <span
      title={m.hint}
      className={cn('inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium', m.className, className)}
    >
      <Icon className="size-3.5" aria-hidden />
      {m.label}
    </span>
  )
}

export const classificationHint = (c: Classification) => classMeta[c].hint

export function SkillChip({
  skillId,
  label,
  tone = 'neutral',
  className,
}: {
  skillId?: string
  label?: string
  tone?: 'neutral' | 'teal' | 'peach'
  className?: string
}) {
  const name = label ?? (skillId ? (skillById[skillId]?.name ?? skillId) : '')
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-xs leading-none',
        tone === 'neutral' && 'border-border bg-subtle text-muted-foreground',
        tone === 'teal' && 'border-teal/30 bg-mint text-accent-foreground',
        tone === 'peach' && 'border-exp-high/60 bg-exp-high/20 text-foreground',
        className,
      )}
    >
      {name}
    </span>
  )
}

export function DirectionBadge({ direction }: { direction: 1 | -1 }) {
  const up = direction === 1
  const Icon = up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        up ? 'bg-exp-high/25 text-foreground' : 'bg-mint text-accent-foreground',
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {up ? 'Raises exposure' : 'Lowers exposure'}
    </span>
  )
}

export function EvidenceBadge({ evidence }: { evidence: 'verified' | 'assumption' | 'user' }) {
  const map = {
    verified: { icon: BadgeCheck, label: 'Published source', cls: 'text-accent-foreground' },
    assumption: { icon: FlaskConical, label: 'Assumption', cls: 'text-muted-foreground' },
    user: { icon: UserPen, label: 'Added by you', cls: 'text-foreground' },
  }[evidence]
  const Icon = map.icon
  return (
    <span className={cn('inline-flex items-center gap-1 font-sans text-xs font-medium', map.cls)}>
      <Icon className="size-3.5" aria-hidden />
      {map.label}
    </span>
  )
}

export function SdgBadge({ id }: { id: number }) {
  const sdg = sdgs.find((s) => s.id === id)
  if (!sdg) return null
  return (
    <span
      title={`SDG ${sdg.id}: ${sdg.name}`}
      className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-1.5 py-0.5 text-[11px] text-muted-foreground"
    >
      <span className="size-2 rounded-[2px]" style={{ backgroundColor: sdg.color }} aria-hidden />
      <span className="font-mono">SDG {sdg.id}</span>
      <span className="sr-only">{sdg.name}</span>
    </span>
  )
}

export function DemoLabel({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-dashed border-border-strong px-2 py-0.5 font-sans text-xs font-medium text-muted-foreground',
        className,
      )}
    >
      <FlaskConical className="size-3" aria-hidden />
      Illustrative data
    </span>
  )
}
