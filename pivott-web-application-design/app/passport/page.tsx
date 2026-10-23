'use client'

import { FileDown, ImageDown } from 'lucide-react'
import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { PassportCard, type PassportData } from '@/components/passport/passport-card'
import { deriveSkillGroups } from '@/components/map/skills-panel'
import { CopyButton } from '@/components/pivott/copy-button'
import { PButton } from '@/components/pivott/p-button'
import { PageIntro } from '@/components/pivott/route-stepper'
import { NeedsProfile, PageSkeleton } from '@/components/pivott/states'
import { roleById } from '@/lib/data/seed'
import { buildPathway } from '@/lib/engine'
import { downloadFile } from '@/lib/ics'
import { NameField } from '@/components/pivott/name-field'
import { displayName, possessive, useAnalysis, useAppState } from '@/lib/store'

export default function PassportPage() {
  const { state, hydrated } = useAppState()
  const { routes, allRoutes, scored } = useAnalysis(state)
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState<'png' | 'pdf' | null>(null)
  if (!hydrated) return <PageSkeleton />
  if (!state.roleId) return <NeedsProfile step="job" />
  const targetId = state.targetRoleId ?? routes[0]?.roleId
  if (!targetId) return <NeedsProfile step="route" />

  const target = roleById[targetId]
  const route = allRoutes.find((r) => r.roleId === targetId)
  const { steps, weeks } = buildPathway({ targetRoleId: targetId, levels: state.skills, hoursPerWeek: state.hoursPerWeek, freeOnly: state.freeOnly })
  const { stays } = deriveSkillGroups(scored, state.skills, route)
  const date = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

  const unknown = target.requirements.filter((requirement) => state.skills[requirement.skillId] === undefined).length
  const rated = target.requirements.length - unknown
  const fit = route?.fit ?? 0
  const data: PassportData = {
    name: displayName(state),
    currentRole: state.jobTitle || roleById[state.roleId]?.title || '',
    destination: target.title,
    destinationFamily: target.family,
    match: fit,
    ratedSkillCount: rated, unknownSkillCount: unknown,
    weeks,
    skills: stays.length ? stays : Object.entries(state.skills).filter(([, v]) => v >= 3).map(([k]) => k),
    steps,
    completed: new Set(state.completedSteps),
    date,
    code: `PV-${target.id.slice(0, 3).toUpperCase()}-${String(Math.round(fit * 10)).padStart(4, '0')}`,
  }

  const summary = `${possessive(data.name, 'My')} Pivott Skill Passport: ${data.currentRole} → ${data.destination}. ${rated ? `${Math.round(fit)}% fit based on rated skills` : 'Skills not rated'}${unknown ? ' (incomplete comparison)' : ''}, ${rated ? `${unknown ? 'partial ' : ''}est. ${weeks} weeks at ${state.hoursPerWeek} h/week` : 'learning time not estimated'}. Route: ${steps.map((s) => s.title).join(' → ') || (unknown ? 'rate remaining skills to estimate learning needs' : 'no gaps identified')}. How scores work: https://pivottstudio.vercel.app/method`

  async function renderPng() {
    const { toPng } = await import('html-to-image')
    return toPng(cardRef.current!, { pixelRatio: 2, cacheBust: true })
  }

  async function downloadPng() {
    setBusy('png')
    try {
      const url = await renderPng()
      const a = document.createElement('a')
      a.href = url
      a.download = 'pivott-skill-passport.png'
      a.click()
      toast.success('Passport saved as PNG')
    } catch {
      toast.error('Couldn’t render the image. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  async function downloadPdf() {
    setBusy('pdf')
    try {
      const [{ jsPDF }, url] = await Promise.all([import('jspdf'), renderPng()])
      const el = cardRef.current!
      const ratio = el.offsetHeight / el.offsetWidth
      const pdf = new jsPDF({ orientation: ratio < 1 ? 'landscape' : 'portrait', unit: 'pt', format: 'a4' })
      const pw = pdf.internal.pageSize.getWidth()
      const ph = pdf.internal.pageSize.getHeight()
      const margin = 32
      let w = pw - margin * 2
      let h = w * ratio
      if (h > ph - margin * 2) {
        h = ph - margin * 2
        w = h / ratio
      }
      pdf.addImage(url, 'PNG', (pw - w) / 2, (ph - h) / 2, w, h)
      downloadFile(pdf.output('blob'), 'pivott-skill-passport.pdf', 'application/pdf')
      toast.success('Passport saved as PDF')
    } catch {
      toast.error('Couldn’t create the PDF. Please try again.')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-10">
      <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
        <PageIntro eyebrow="Summary" title="Skill Passport">A one-page summary of your target role, skill match and plan.</PageIntro>
        <NameField label="Name on passport" className="md:max-w-xs" />
      </div>

      <div className="mt-10" style={{ perspective: 1400 }}>
        <div>
          <PassportCard ref={cardRef} data={data} />
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <PButton onClick={downloadPng} loading={busy === 'png'}>
          <ImageDown aria-hidden />
          Download PNG
        </PButton>
        <PButton variant="secondary" onClick={downloadPdf} loading={busy === 'pdf'}>
          <FileDown aria-hidden />
          Download PDF
        </PButton>
        <CopyButton text={summary} label="Copy summary" toastMessage="Summary copied" className="h-11 px-5" />
      </div>
    </div>
  )
}
