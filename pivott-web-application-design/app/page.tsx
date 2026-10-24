import Link from 'next/link'
import { getCatalog } from '@/lib/catalog'
import { catalogSource, hasDemoPersona, resources } from '@/lib/data/seed'
import { ArrowRight } from 'lucide-react'
import { LivingTaskMap } from '@/components/landing/living-task-map'
import { ResumeWork } from '@/components/pivott/resume-work'
import { PLink } from '@/components/pivott/p-button'

export default async function LandingPage() {
  await getCatalog()
  return (
    <>
      <ResumeWork />
      <section className="landing-hero relative overflow-hidden">
        <div className="relative mx-auto grid w-full max-w-[1240px] items-center gap-12 px-5 pb-16 pt-12 sm:px-8 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14 lg:pb-20 lg:pt-16">
          <div className="flex flex-col items-start">
            <h1 className="max-w-xl text-[3rem] font-semibold leading-[1.06] tracking-[-0.045em] text-balance sm:text-[4rem] lg:text-[4.5rem]">
              Plan your next move from the work you do.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-muted-foreground text-pretty">
              For clerical and finance workers in Malaysia: compare your daily tasks, nearby roles and skills to practise, then leave with a learning plan.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
              <PLink href="/start" size="lg">Map my work<ArrowRight aria-hidden /></PLink>
              {hasDemoPersona && (
              <Link href="/example" className="group inline-flex min-h-11 items-center gap-2.5 rounded-lg text-sm font-medium text-foreground underline-offset-4 hover:underline">
                <span className="grid size-8 place-items-center rounded-full border border-border-strong bg-card transition-colors group-hover:border-primary"><span className="ml-0.5 size-0 border-y-[4px] border-l-[6px] border-y-transparent border-l-primary" aria-hidden /></span>
                View an example
              </Link>
              )}
            </div>
            <p className="mt-6 text-xs text-muted-foreground">Fresh graduates can start with tasks from study, placements or a sample profile. No account needed.</p>
          </div>
          <LivingTaskMap />
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8" aria-labelledby="sample-walkthrough"><h2 id="sample-walkthrough" className="text-2xl font-semibold">A sample walkthrough</h2><p className="mt-3 text-sm text-muted-foreground">Aisyah is a sample profile, not a real person. Her ratings are fictional.</p><ol className="mt-5 max-w-3xl list-decimal space-y-4 pl-5 text-sm"><li>Profile: review bookkeeping tasks and edit the sample ratings.</li><li>Radar: check dated public-feed trends, or see which data threshold is missing.</li><li>Route: compare scenarios, choose your priorities and build a plan from rated gaps.</li></ol><h2 className="mt-8 text-xl font-semibold">Malaysia is the focus; the data has limits</h2><p className="mt-3 max-w-3xl text-sm text-muted-foreground">The current reference catalogue describes US occupations, and the posting feed mainly covers Germany. Use it to explore skills and questions for your next conversation, not as a forecast of Malaysian vacancies.</p><Link href="/method" className="mt-2 inline-flex min-h-11 items-center text-sm underline">Sources, dates and limitations</Link><Link href="/jobs" className="ml-5 inline-flex min-h-11 items-center text-sm underline">Browse public job listings</Link></section>
      <section aria-labelledby="tools-title" className="mx-auto w-full max-w-[1240px] px-5 py-12 sm:px-8">
        <h2 id="tools-title" className="text-2xl font-semibold">What you can use</h2>
        <ul className="mt-5 max-w-2xl list-disc space-y-3 pl-5 text-muted-foreground">
          <li>A task map showing time spent and estimated AI exposure.</li>
          <li>Choose three, five or ten nearby roles to compare, with skill gaps, scenarios and optional SDG priorities.</li>
          <li>A week-by-week study plan with project deliverables and a calendar file.{resources.length > 0 ? " Catalogue resources can be filtered to free options." : " Learning resources have not been added to this catalogue yet."}</li>
        </ul>
      </section>


    </>
  )
}
