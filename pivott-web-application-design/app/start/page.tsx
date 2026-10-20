'use client'

import { ArrowRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { MobileActionBar } from '@/components/pivott/mobile-action-bar'
import { PLink } from '@/components/pivott/p-button'
import { PageIntro } from '@/components/pivott/route-stepper'
import { PageSkeleton } from '@/components/pivott/states'
import { RoleSelector } from '@/components/start/role-selector'
import { TaskPicker } from '@/components/start/task-picker'
import { TimePanel } from '@/components/start/time-panel'
import { roleById, tasksForRole } from '@/lib/data/seed'
import { NameField } from '@/components/pivott/name-field'
import { greetingName, setState, useAppState } from '@/lib/store'

export default function StartPage() {
  const { state, hydrated } = useAppState()
  if (!hydrated) return <PageSkeleton />

  function selectRole(id: string) {
    if (id === state.roleId) return
    setState({
      roleId: id,
      selections: tasksForRole(id).map((t) => ({ taskId: t.id, share: t.defaultShare })),
      customTasks: [],
      targetRoleId: null,
      completedSteps: [],
    })
  }

  const role = state.roleId ? roleById[state.roleId] : null

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-32 pt-10 lg:pb-20">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow={`Step 1 · Hi ${greetingName(state)}`} title="Let’s start with your work.">
          Choose the role closest to yours, then tune the tasks you actually do.
        </PageIntro>
        <NameField className="md:max-w-xs" />
      </div>

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="flex min-w-0 flex-col gap-8">
          <RoleSelector value={state.roleId} onSelect={selectRole} />

          <AnimatePresence mode="wait">
            {role && (
              <motion.section
                key={role.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3 }}
                aria-labelledby="tasks-title"
                className="flex flex-col gap-4"
              >
                <div className="flex items-baseline justify-between">
                  <h2 id="tasks-title" className="font-serif text-3xl">
                    Tasks for {role.title}
                  </h2>
                  <span className="font-mono text-xs text-muted-foreground">{role.family}</span>
                </div>
                <TaskPicker state={state} />
              </motion.section>
            )}
          </AnimatePresence>
        </div>

        {role && (
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <TimePanel state={state} />
          </aside>
        )}
      </div>

      {role && (
        <MobileActionBar>
          <PLink href="/skills" className="w-full">
            Continue to skills
            <ArrowRight aria-hidden />
          </PLink>
        </MobileActionBar>
      )}
    </div>
  )
}
