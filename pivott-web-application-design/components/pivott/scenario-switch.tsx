'use client'

import { Gauge, Zap } from 'lucide-react'
import { toast } from 'sonner'
import { computeRoutes, getScenario, roleExposure, type ScenarioId } from '@/lib/engine'
import { activeSignals, computeScored, setState, type AppState } from '@/lib/store'
import { SegmentedControl } from './segmented-control'

export function ScenarioSwitch({ state, context = 'map', onPreset }: { state: AppState; context?: 'map' | 'routes'; onPreset?: () => void }) {
  function change(next: ScenarioId) {
    onPreset?.()
    if (next === state.scenario) return
    const before = computeScored(state, state.scenario)
    const after = computeScored(state, next)
    const b = roleExposure(before)
    const a = roleExposure(after)
    const reclassified = after.filter((t, i) => t.classification !== before[i]?.classification).length

    let rankingNote = ''
    if (state.roleId) {
      const skillsUsed = [...new Set(after.flatMap((t) => t.skills))]
      const base = { currentRoleId: state.roleId, userTaskSkills: skillsUsed, levels: state.skills, signals: activeSignals(state), hoursPerWeek: state.hoursPerWeek }
      const r0 = computeRoutes({ ...base, scenarioId: state.scenario })[0]
      const r1 = computeRoutes({ ...base, scenarioId: next })[0]
      if (r0 && r1 && r0.roleId !== r1.roleId) rankingNote = ` ${r1.title} is now your closest match.`
    }

    setState({ scenario: next })
    toast(`${getScenario(next).label} scenario`, {
      description:
        context === 'map'
          ? `Task exposure ${a > b ? 'rose' : 'fell'} from ${Math.round(b * 100)}% to ${Math.round(a * 100)}%. ${reclassified} task${reclassified === 1 ? '' : 's'} reclassified.${rankingNote}`
          : `Routes recalculated with ${getScenario(next).multiplier}× base exposure.${rankingNote}`,
    })
  }

  return (
    <SegmentedControl
      label="AI adoption scenario"
      value={state.scenario}
      onChange={change}
      size="sm"
      options={[
        { value: 'slow', label: 'Slow' },
        { value: 'normal', label: 'Normal', icon: <Gauge className="size-3.5" aria-hidden /> },
        { value: 'fast', label: 'Fast', icon: <Zap className="size-3.5" aria-hidden /> },
      ]}
    />
  )
}
