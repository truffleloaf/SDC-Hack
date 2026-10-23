'use client'
import { useAppState, setState } from '@/lib/store'
import { roleById } from '@/lib/data/seed'
import { buildPathway } from '@/lib/engine'
import { PButton, PLink } from '@/components/pivott/p-button'
import { PageSkeleton } from '@/components/pivott/states'
import { useSignIn } from '@/components/account/sign-in-dialog'
import { useAccount } from '@/components/account/account-provider'
export default function WorkspacePage() {
  const { state, hydrated, saveStatus } = useAppState()
  const account = useAccount()
  const { openSignIn } = useSignIn()
  if (!hydrated) return <PageSkeleton />
  const role = state.targetRoleId ? roleById[state.targetRoleId] : null
  const plan = role ? buildPathway({ targetRoleId: role.id, levels: state.skills, hoursPerWeek: state.hoursPerWeek, freeOnly: state.freeOnly }) : null
  const next = plan?.steps.find((step) => !state.completedSteps.includes(step.id))
  const complete = plan?.steps.filter((step) => state.completedSteps.includes(step.id)).length ?? 0
  return <div className="mx-auto max-w-3xl px-5 py-10"><h1 className="text-3xl font-semibold tracking-tight">Your plan</h1><p className="mt-3 text-xl">{role?.title || 'Choose a route when you are ready.'}</p>
    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{next ? `Next: ${next.title}` : role ? 'Review your plan and any skills still to rate.' : 'Start with your tasks, then compare possible roles.'}</p>
    <PLink className="mt-6" href={role ? '/pathway' : state.roleId ? '/map' : '/start'}>{role ? 'Continue plan' : state.roleId ? 'Open my work' : 'Map my work'}</PLink>
    <div className="mt-8 divide-y divide-border border-y border-border text-sm"><p className="py-4">Work profile: {state.jobTitle || (state.roleId && roleById[state.roleId]?.title) || 'Not set'}{state.jobTitle && state.roleId ? ` · Template: ${roleById[state.roleId]?.title}` : ''}</p><p className="py-4">Learning progress: {complete} of {plan?.steps.length ?? 0} currently estimated steps complete</p><p className="py-4">Last profile update: {state.updatedAt ? new Date(state.updatedAt).toLocaleString() : 'Not recorded'}</p><p className="py-4">{saveStatus === 'error' ? 'Couldn’t save on this device.' : 'Saved on this device'}{saveStatus === 'error' && <PButton size="sm" variant="ghost" onClick={() => setState({})}>Retry device save</PButton>}</p></div>
    <section className="mt-6"><h2 className="text-lg font-semibold">Routes you are considering</h2><ul className="mt-3 space-y-2">{state.savedRouteIds.map((id) => <li key={id}><PLink href="/routes" variant="link">{roleById[id]?.title}</PLink></li>)}</ul>{!state.savedRouteIds.length && <p className="mt-2 text-sm text-muted-foreground">No routes saved yet.</p>}</section>
    <div className="mt-6 flex flex-wrap gap-3"><PLink href="/start" variant="secondary" size="sm">Edit tasks</PLink><PLink href="/skills" variant="secondary" size="sm">Edit skills</PLink></div>
    <section className="mt-8 grid gap-4 sm:grid-cols-2"><label className="flex flex-col gap-2 text-sm">Career goal (optional)<input className="pivott-input" maxLength={200} value={state.careerGoal} onChange={(event) => setState({ careerGoal: event.target.value })} /></label><label className="flex flex-col gap-2 text-sm">Learning hours per week<input className="pivott-input" type="number" min={1} max={40} value={state.hoursPerWeek} onChange={(event) => { const value = event.target.valueAsNumber; if (Number.isFinite(value)) setState({ hoursPerWeek: Math.min(40, Math.max(1, Math.round(value))) }) }} /></label></section>
    <section className="mt-10 border-t border-border pt-6"><h2 className="text-lg font-semibold">Save your work</h2><p role="status" className="mt-2 text-sm text-muted-foreground">{account.status}</p>{account.user ? <PButton className="mt-4" size="sm" loading={account.status.startsWith('Saving')} onClick={() => void account.save()}>Save to account</PButton> : <><p className="mt-2 text-sm text-muted-foreground">Keep your tasks, skills and learning plan across devices with an optional account.</p><PButton onClick={() => openSignIn()} variant="secondary" size="sm" className="mt-4">Sign in to sync</PButton></>}<PLink href="/account" variant="link" className="ml-3">Saving and account settings</PLink></section>
  </div>
}
