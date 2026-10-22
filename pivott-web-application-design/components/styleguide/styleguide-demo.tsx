'use client'

import { Download, Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { ClassificationBadge, DemoLabel, DirectionBadge, EvidenceBadge, ExposureBadge, SdgBadge, SkillChip } from '@/components/pivott/badges'
import { CopyButton } from '@/components/pivott/copy-button'
import { LogoMark, Logo } from '@/components/pivott/logo'
import { PButton } from '@/components/pivott/p-button'
import { CountUp, ProgressRing } from '@/components/pivott/progress-ring'
import { SegmentedControl } from '@/components/pivott/segmented-control'
import { ThemeToggle } from '@/components/pivott/site-header'
import { EmptyState, ErrorState, Skeleton } from '@/components/pivott/states'
import { ValueSlider } from '@/components/pivott/value-slider'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { pButton } from '@/components/pivott/p-button'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 border-t border-border pt-8">
      <h2 className="font-sans text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </section>
  )
}

export function StyleguideDemo() {
  const [seg, setSeg] = useState<'normal' | 'fast'>('normal')
  const [val, setVal] = useState(40)
  const [n, setN] = useState(62)
  const [key, setKey] = useState(0)

  return (
    <div className="flex flex-col gap-10">
      <Section title="Brand">
        <Logo />
        <span key={key} className="text-foreground">
          <LogoMark animated className="size-12" />
        </span>
        <PButton variant="ghost" size="sm" onClick={() => setKey((k) => k + 1)}>Replay intro</PButton>
        <ThemeToggle />
      </Section>

      <Section title="Colour">
        {['bg-background', 'bg-subtle', 'bg-card', 'bg-mint', 'bg-sky', 'bg-teal', 'bg-primary', 'bg-exp-low', 'bg-exp-mid', 'bg-exp-high'].map((c) => (
          <span key={c} className="flex flex-col items-center gap-1.5">
            <span className={`size-12 rounded-xl border border-border ${c}`} />
            <span className="font-mono text-[10px] text-muted-foreground">{c.replace('bg-', '')}</span>
          </span>
        ))}
      </Section>

      <Section title="Type">
        <div className="flex w-full flex-col gap-2">
          <p className="font-serif text-5xl tracking-[-0.02em]">Newsreader display — <em>Map the tasks.</em></p>
          <p className="text-base leading-relaxed">Inter body text for interface copy and descriptions.</p>
          <p className="font-mono text-sm text-muted-foreground">Geist Mono · 62% · 01 Oct 2026</p>
        </div>
      </Section>

      <Section title="Buttons">
        <PButton>Primary</PButton>
        <PButton variant="secondary">Secondary</PButton>
        <PButton variant="ghost">Ghost</PButton>
        <PButton variant="secondary" size="icon" aria-label="Add"><Plus /></PButton>
        <PButton loading>Loading</PButton>
        <PButton disabled>Disabled</PButton>
        <PButton variant="link">Text link</PButton>
      </Section>

      <Section title="Badges & chips">
        <ExposureBadge value={0.32} />
        <ExposureBadge value={0.56} />
        <ExposureBadge value={0.82} />
        <ClassificationBadge value="Automate" />
        <ClassificationBadge value="Augment" />
        <ClassificationBadge value="Protect" />
        <SkillChip skillId="sql" />
        <SkillChip skillId="controls" tone="teal" />
        <SkillChip skillId="python" tone="peach" />
        <DirectionBadge direction={1} />
        <DirectionBadge direction={-1} />
        <EvidenceBadge evidence="verified" />
        <EvidenceBadge evidence="illustrative" />
        <SdgBadge id={8} />
        <DemoLabel />
      </Section>

      <Section title="Controls">
        <SegmentedControl label="Scenario" value={seg} onChange={setSeg} options={[{ value: 'normal', label: 'Normal' }, { value: 'fast', label: 'Fast' }]} />
        <div className="w-64">
          <ValueSlider label="Demo slider" value={val} onChange={setVal} />
        </div>
        <Tooltip>
          <TooltipTrigger className={pButton({ variant: 'secondary', size: 'sm' })}>Hover for tooltip</TooltipTrigger>
          <TooltipContent>Short, useful context.</TooltipContent>
        </Tooltip>
        <CopyButton text="Pivott" />
        <PButton variant="secondary" size="sm" onClick={() => toast.success('Saved', { description: 'A subtle success toast.' })}>
          <Download /> Toast
        </PButton>
      </Section>

      <Section title="Overlays">
        <Dialog>
          <DialogTrigger className={pButton({ variant: 'secondary', size: 'sm' })}>Dialog</DialogTrigger>
          <DialogContent className="rounded-[20px]">
            <DialogHeader>
              <DialogTitle className="font-serif text-2xl font-normal">A calm dialog</DialogTitle>
              <DialogDescription>Used for confirmations like deleting data.</DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
        <Sheet>
          <SheetTrigger className={pButton({ variant: 'secondary', size: 'sm' })}>Right drawer</SheetTrigger>
          <SheetContent side="right"><SheetHeader><SheetTitle className="font-serif text-2xl font-normal">Drawer</SheetTitle></SheetHeader></SheetContent>
        </Sheet>
        <Sheet>
          <SheetTrigger className={pButton({ variant: 'secondary', size: 'sm' })}>Bottom sheet</SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-[24px]"><SheetHeader><SheetTitle className="font-serif text-2xl font-normal">Bottom sheet</SheetTitle></SheetHeader></SheetContent>
        </Sheet>
      </Section>

      <Section title="Data">
        <ProgressRing value={n / 100} size={72} label="Demo">
          <span className="font-mono text-sm">{n}%</span>
        </ProgressRing>
        <CountUp value={n} format={(v) => `${Math.round(v)}%`} className="font-serif text-5xl" />
        <PButton variant="ghost" size="sm" onClick={() => setN(Math.round(20 + ((n * 7) % 75)))}>Change value</PButton>
      </Section>

      <Section title="States">
        <div className="grid w-full gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-3"><Skeleton className="h-6 w-2/3" /><Skeleton className="h-24" /></div>
          <EmptyState title="Nothing here yet" description="Friendly guidance for what to do next." />
          <ErrorState onRetry={() => toast('Retried')} />
        </div>
      </Section>
    </div>
  )
}
