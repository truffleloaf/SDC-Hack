import Link from 'next/link'
import { ArrowRight, Briefcase, Lock, Route, ScanSearch, Scale } from 'lucide-react'
import { LivingTaskMap } from '@/components/landing/living-task-map'
import { LogoMark } from '@/components/pivott/logo'
import { PLink } from '@/components/pivott/p-button'

const steps = [
  { icon: Briefcase, title: 'Pick your job', body: 'Start with the tasks you actually perform.' },
  { icon: ScanSearch, title: 'See your tasks', body: 'Understand which tasks AI may automate, augment, or leave to human judgment.' },
  { icon: Route, title: 'Find your route', body: 'Discover adjacent roles and the skills needed to move forward.' },
]

export default function LandingPage() {
  return (
    <>
      <section className="relative -mt-20 overflow-hidden pt-20">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(60% 55% at 70% 40%, color-mix(in srgb, var(--mint) 90%, transparent), transparent 70%), radial-gradient(45% 45% at 20% 20%, color-mix(in srgb, var(--sky) 80%, transparent), transparent 70%)',
          }}
        />
        <div aria-hidden className="dot-grid dot-grid-fade pointer-events-none absolute inset-0 opacity-70" />

        <div className="relative mx-auto grid w-full max-w-[1200px] items-center gap-10 px-5 pb-16 pt-12 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-24">
          <div className="flex flex-col gap-7">
            <p className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card/70 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              <span className="size-1.5 rounded-full bg-teal" aria-hidden />
              Task-level career mapping
            </p>
            <h1 className="font-serif text-[3.25rem] leading-[0.98] tracking-[-0.03em] text-balance sm:text-6xl lg:text-[5.25rem]">
              Don&apos;t predict the job.
              <br />
              <em className="text-primary">Map the tasks.</em>
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground text-pretty">
              See how AI changes the work you do, discover where your skills can take you, and build a practical route to your next opportunity.
            </p>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4">
              <PLink href="/start" size="lg">
                Map my job
                <ArrowRight aria-hidden />
              </PLink>
              <Link
                href="/example"
                className="group inline-flex min-h-11 items-center gap-2 rounded-lg text-sm font-medium text-foreground underline-offset-4 hover:underline"
              >
                <span className="grid size-7 place-items-center rounded-full border border-border-strong bg-card transition-colors group-hover:border-teal">
                  <span className="ml-0.5 size-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-primary" aria-hidden />
                </span>
                See a 30-second example
              </Link>
            </div>
          </div>

          <LivingTaskMap />
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto w-full max-w-[1200px] px-5 py-20">
        <h2 id="how-title" className="sr-only">
          How Pivott works
        </h2>
        <ol className="relative grid gap-12 md:grid-cols-3 md:gap-8">
          <span
            aria-hidden
            className="absolute bottom-6 left-6 top-6 border-l-2 border-dotted border-teal/60 md:bottom-auto md:left-6 md:right-[16%] md:top-6 md:border-l-0 md:border-t-2"
          />
          {steps.map((s, i) => (
            <li key={s.title} className="relative flex gap-5 md:flex-col">
              <span className="relative z-10 grid size-12 shrink-0 place-items-center rounded-full border border-border bg-card text-primary shadow-soft">
                <s.icon className="size-5" strokeWidth={1.5} aria-hidden />
              </span>
              <div className="flex flex-col gap-2">
                <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-faint">Step {i + 1}</p>
                <h3 className="font-serif text-2xl tracking-[-0.01em]">{s.title}</h3>
                <p className="max-w-xs leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-5 pb-16">
        <div className="flex flex-col gap-6 rounded-[20px] border border-border bg-subtle px-6 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <p className="flex items-center gap-3 text-sm font-medium">
            <Lock className="size-4 text-primary" aria-hidden />
            No login. Your profile stays in your browser.
          </p>
          <p className="flex max-w-xl items-start gap-3 text-sm leading-relaxed text-muted-foreground">
            <Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            Task exposure describes work AI could potentially handle. It does not predict whether anyone will lose their job.
          </p>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1200px] flex-col items-start justify-between gap-4 border-t border-border px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center">
        <span className="flex items-center gap-2">
          <LogoMark className="size-5 text-foreground" />
          <span className="font-serif text-base text-foreground">Pivott</span>
          <span className="hidden sm:inline">· Don&apos;t predict the job. Map the tasks. Route the skills.</span>
        </span>
        <span className="font-mono text-xs">Illustrative demo data · Scores are deterministic</span>
      </footer>
    </>
  )
}
