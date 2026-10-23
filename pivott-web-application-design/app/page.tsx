import Link from 'next/link'
import { ArrowRight, Scale } from 'lucide-react'
import { LivingTaskMap } from '@/components/landing/living-task-map'
import { ResumeWork } from '@/components/pivott/resume-work'
import { LogoMark } from '@/components/pivott/logo'
import { PLink } from '@/components/pivott/p-button'

export default function LandingPage() {
  return (
    <>
      <ResumeWork />
      <section className="landing-hero relative overflow-hidden">
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="flex flex-col items-start">
            <h1 className="max-w-xl text-[3rem] font-semibold leading-[1.06] tracking-[-0.045em] text-balance sm:text-[4rem] lg:text-[4.5rem]">
              See which parts of your job AI could take on.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              Pick your role and the tasks you do. Pivott scores how exposed each task is, then lists nearby roles that reuse your skills, with a study plan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PLink href="/start" size="lg">Map my work<ArrowRight aria-hidden /></PLink>
              <Link href="/example" className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg text-sm font-medium text-foreground underline-offset-4 hover:underline">
                <span className="grid size-8 place-items-center rounded-full border border-border-strong bg-card transition-colors group-hover:border-primary"><span className="ml-0.5 size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-primary" aria-hidden /></span>
                View an example
              </Link>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">No account needed. Your answers stay in this browser.</p>
          </div>
          <LivingTaskMap />
        </div>
      </section>

      <section aria-labelledby="tools-title" className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8">
        <h2 id="tools-title" className="text-2xl font-semibold">What you can use</h2>
        <ul className="mt-5 max-w-2xl list-disc space-y-3 pl-5 text-muted-foreground">
          <li>A task map showing time spent and estimated AI exposure.</li>
          <li>Up to three ranked nearby roles, with the skills to add.</li>
          <li>A week-by-week study plan with free resources and a calendar file.</li>
        </ul>
      </section>

      <footer className="mx-auto flex w-full max-w-[1240px] flex-col justify-between gap-5 border-t border-border px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:px-8">
        <span className="flex items-center gap-2 self-start"><LogoMark className="size-6 text-primary" title="" /><span className="text-base font-semibold text-foreground">Pivott</span></span>
        <p className="flex max-w-xl items-start gap-3 text-xs leading-relaxed"><Scale className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />Task exposure describes work AI could potentially handle. It does not predict whether anyone will lose their job. Illustrative demo data; scores are deterministic.</p>
      </footer>
    </>
  )
}
