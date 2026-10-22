import Link from 'next/link'
import { ArrowRight, Lock, Scale } from 'lucide-react'
import { LivingTaskMap } from '@/components/landing/living-task-map'
import { CareerRoute } from '@/components/landing/career-route'
import { LogoMark } from '@/components/pivott/logo'
import { PLink } from '@/components/pivott/p-button'

const steps = [
  { title: 'Pick your job', body: 'Start with the tasks you actually perform.' },
  { title: 'See your tasks', body: 'Understand which tasks AI may automate, augment, or leave to human judgment.' },
  { title: 'Find your route', body: 'Discover adjacent roles and the skills needed to move forward.' },
]

export default function LandingPage() {
  return (
    <>
      <section className="landing-hero relative overflow-hidden">
        <div aria-hidden className="hero-contour pointer-events-none absolute -right-32 -top-64 size-[880px] rounded-full border border-border/60" />
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="flex flex-col items-start">
            <p className="mb-6 flex items-center gap-3 text-sm font-medium text-primary"><span className="h-px w-8 bg-primary" aria-hidden />A clearer view of your working life</p>
            <h1 className="max-w-xl text-[3rem] font-semibold leading-[1.06] tracking-[-0.045em] text-balance sm:text-[4rem] lg:text-[4.5rem]">
              Don&apos;t predict the job.<br /><span className="text-primary">Map the tasks.</span>
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              See how AI changes the work you do, discover where your skills can take you, and build a practical route to your next opportunity.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PLink href="/start" size="lg">Map my job<ArrowRight aria-hidden /></PLink>
              <Link href="/example" className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg text-sm font-medium text-foreground underline-offset-4 hover:underline">
                <span className="grid size-8 place-items-center rounded-full border border-border-strong bg-card transition-colors group-hover:border-primary"><span className="ml-0.5 size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-primary" aria-hidden /></span>
                See a 30-second example
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-xs text-muted-foreground"><Lock className="size-3.5" aria-hidden />No login. Your profile stays in your browser.</p>
            <div className="mt-10 flex items-center gap-3 border-t border-border pt-5 text-sm text-muted-foreground">
              <span className="flex -space-x-1.5" aria-hidden><span className="size-5 rounded-full border-2 border-background bg-exp-low" /><span className="size-5 rounded-full border-2 border-background bg-exp-mid" /><span className="size-5 rounded-full border-2 border-background bg-exp-high" /></span>
              A job title is only the beginning. Look at the work within it.
            </div>
          </div>
          <LivingTaskMap />
        </div>
      </section>

      <section aria-labelledby="how-title" className="mx-auto w-full max-w-[1240px] px-5 py-14 sm:px-8 lg:py-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h2 id="how-title" className="max-w-lg text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">A little clarity.<br />A practical next step.</h2>
          <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">From the tasks you do today to the skills you can use tomorrow.</p>
        </div>
        <ol className="mt-9 grid gap-8 md:grid-cols-3 md:gap-10">
          {steps.map((step, index) => (
            <li key={step.title} className="relative border-t border-border-strong pt-5">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-mint text-sm font-semibold text-accent-foreground" aria-hidden>{index + 1}</span>
              <h3 className="mt-4 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="route-title" className="mx-auto w-full max-w-[1240px] px-5 pb-16 sm:px-8">
        <div className="grid overflow-hidden rounded-[24px] border border-border bg-mint/40 md:grid-cols-[0.8fr_1.2fr] md:items-center">
          <div className="px-6 pb-0 pt-8 sm:px-8 md:py-8">
            <h2 id="route-title" className="max-w-xs text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">Your experience doesn&apos;t start from zero.</h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">See how the skills you already use can connect to an adjacent role. Then make a plan for the gaps.</p>
            <p className="mt-4 text-xs text-muted-foreground">An example route from Aisyah’s demo profile.</p>
          </div>
          <div className="px-3 py-5 sm:px-6 md:py-8"><CareerRoute /></div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-[1240px] flex-col justify-between gap-5 border-t border-border px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
        <span className="flex items-center gap-2 self-start"><LogoMark className="size-6 text-primary" title="" /><span className="text-base font-semibold text-foreground">Pivott</span></span>
        <p className="flex max-w-xl items-start gap-3 text-xs leading-relaxed"><Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />Task exposure describes work AI could potentially handle. It does not predict whether anyone will lose their job. Illustrative demo data; scores are deterministic.</p>
      </footer>
    </>
  )
}
