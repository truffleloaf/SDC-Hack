'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PButton } from '@/components/pivott/p-button'
import { roles, roleById, skillById, tasksForRole } from '@/lib/data/seed'
import { getState, setState, useAppState } from '@/lib/store'
import { resumeProfilePatch, suggestFromResume, type ResumeSuggestions } from '@/lib/resume/match'

export function ResumeImport() {
  const { state } = useAppState()
  const input = useRef<HTMLInputElement>(null)
  const controller = useRef<AbortController | null>(null)
  const request = useRef(0)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [suggestions, setSuggestions] = useState<ResumeSuggestions | null>(null)
  const [roleId, setRoleId] = useState('')
  const [jobTitle, setJobTitle] = useState('')
  const [taskIds, setTaskIds] = useState<string[]>([])
  const [skillIds, setSkillIds] = useState<string[]>([])

  useEffect(() => () => { request.current++; controller.current?.abort() }, [])

  function close() {
    request.current++
    controller.current?.abort()
    controller.current = null
    setOpen(false); setBusy(false); setText(''); setSuggestions(null); setError('')
    setRoleId(''); setJobTitle(''); setTaskIds([]); setSkillIds([])
    if (input.current) input.current.value = ''
  }

  async function read(file: File) {
    controller.current?.abort()
    const currentRequest = ++request.current
    const abort = new AbortController()
    controller.current = abort
    setOpen(true); setBusy(true); setError(''); setSuggestions(null); setText('')
    const timer = setTimeout(() => abort.abort(), 25000)
    try {
      const { readResumeFile } = await import('@/lib/resume/files')
      const extracted = await readResumeFile(file, abort.signal)
      if (request.current !== currentRequest) return
      abort.signal.throwIfAborted()
      const draft = suggestFromResume(extracted)
      const proposedRole = draft.roles[0]?.id ?? ''
      setText(extracted); setSuggestions(draft); setRoleId(proposedRole)
      setJobTitle(getState().jobTitle)
      setTaskIds(draft.tasks.filter((item) => tasksForRole(proposedRole).some((task) => task.id === item.id)).map((item) => item.id))
      setSkillIds(draft.skills.map((item) => item.id))
    } catch (failure) {
      if (request.current !== currentRequest) return
      const message = failure instanceof Error ? failure.message : ''
      setError(abort.signal.aborted ? 'Reading took too long. Try a shorter file or continue with manual setup.' : /^(Choose|This|There|Image)/.test(message) ? message : 'Couldn’t read this file. Export a fresh text-based PDF or DOCX and try again, or continue with manual setup.')
    } finally {
      clearTimeout(timer)
      if (request.current === currentRequest) setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  function apply(event: React.FormEvent) {
    event.preventDefault()
    const current = getState()
    try {
      const patch = resumeProfilePatch(current, { roleId, jobTitle, taskIds, skillIds })
      if ((current.roleId || current.selections.length || current.targetRoleId) && !window.confirm('Replace your current reference role and task selection, and reset the active plan? Your skill ratings, custom tasks, saved routes and career preferences will be kept.')) return
      setState(patch)
      close()
      toast.success('Suggestions applied. Review your tasks and time shares below.')
      requestAnimationFrame(() => document.getElementById('tasks-title')?.focus())
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Couldn’t apply these suggestions. Your work is unchanged.') }
  }

  const availableTasks = tasksForRole(roleId)
  const toggle = (ids: string[], id: string) => ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]
  return <section aria-labelledby="resume-title" className="rounded-xl border border-border bg-card p-5">
    <div className="flex items-start gap-3"><FileText aria-hidden className="mt-0.5 size-5 shrink-0 text-primary" /><div className="min-w-0"><h2 id="resume-title" className="text-lg font-semibold">Start with my résumé</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Get role, task and skill suggestions to review. Your file is read on this device and isn’t uploaded.</p></div></div>
    <input ref={input} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" aria-label="Choose résumé file" className="sr-only" tabIndex={-1} onChange={(event) => { const file = event.target.files?.[0]; if (file) void read(file) }} />
    <PButton className="mt-4" variant="secondary" disabled={state.mode === 'demo'} onClick={() => input.current?.click()}><Upload aria-hidden />Choose résumé</PButton>
    <p className="mt-3 text-xs leading-relaxed text-muted-foreground">PDF or DOCX · Up to 10 MB · PDFs up to 30 pages. Text-based files only; image scans need OCR first. Manual setup is always available below.</p>
    {state.mode === 'demo' && <p className="mt-2 text-sm text-muted-foreground">Exit the example profile before importing your own résumé.</p>}
    <Dialog open={open} onOpenChange={(value) => { if (!value) close() }}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle className="pr-8 text-xl">Review résumé suggestions</DialogTitle><DialogDescription>Your file is never uploaded or stored by Pivott. Extracted text is discarded when you close this review. Only confirmed profile fields are saved. Account upload still requires Save to account.</DialogDescription></DialogHeader>
        <p role="status" className="text-sm">{busy ? 'Reading your résumé on this device…' : suggestions ? 'Check each suggestion before applying it.' : ''}</p>
        {error && <p role="alert" className="rounded-lg border border-border p-3 text-sm text-destructive">{error}</p>}
        {suggestions && <form onSubmit={apply} className="flex flex-col gap-6">
          <p className="text-sm leading-relaxed text-muted-foreground">Matches use words in your résumé and Pivott’s small catalogue. They may reflect an older role or miss experience. No skill levels or time shares are inferred.</p>
          <label className="flex flex-col gap-2 text-sm font-medium">Reference role<select className="pivott-input" value={roleId} required onChange={(event) => { const id = event.target.value; setRoleId(id); setTaskIds(suggestions.tasks.filter((item) => tasksForRole(id).some((task) => task.id === item.id)).map((item) => item.id)) }}><option value="">Choose the closest reference role</option>{roles.map((role) => <option key={role.id} value={role.id}>{role.title}{suggestions.roles.some((item) => item.id === role.id) ? ' · Suggested' : ''}</option>)}</select></label>
          {suggestions.roles.length ? <details><summary className="cursor-pointer text-sm text-primary">Why these roles?</summary><ul className="mt-3 space-y-3">{suggestions.roles.map((role) => <li key={role.id} className="text-sm"><p className="font-medium">{roleById[role.id].title}</p><blockquote className="mt-1 break-words text-muted-foreground">“{role.excerpt}”</blockquote></li>)}</ul></details> : <p className="text-sm text-muted-foreground">No clear role match was found. Choose a reference role if one is useful; you can also continue manually.</p>}
          <label className="flex flex-col gap-2 text-sm font-medium">Your job title (optional)<input className="pivott-input" value={jobTitle} maxLength={60} onChange={(event) => setJobTitle(event.target.value)} /></label>
          {roleId && <fieldset><legend className="font-medium">Tasks to include</legend><p className="mt-2 text-sm text-muted-foreground">Matched tasks start checked. Other rows are template suggestions for you to confirm. Time shares will use template defaults, rebalanced to 100%; adjust them after import.</p><div className="mt-3 divide-y divide-border">{availableTasks.map((task) => {
            const evidence = suggestions.tasks.find((item) => item.id === task.id)
            return <label key={task.id} className="flex items-start gap-3 py-3 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={taskIds.includes(task.id)} onChange={() => setTaskIds(toggle(taskIds, task.id))} /><span className="min-w-0"><span className="font-medium">{task.name}</span><span className="mt-1 block break-words text-xs leading-relaxed text-muted-foreground">{evidence ? `Text match: “${evidence.excerpt}”` : 'From the role template · Not found in the résumé'}</span></span></label>
          })}</div>{!taskIds.length && <p className="text-sm text-muted-foreground">Choose at least one task that reflects your work.</p>}</fieldset>}
          <fieldset><legend className="font-medium">Skills to review later</legend><p className="mt-2 text-sm text-muted-foreground">These skills will appear in your assessment. New skills stay unrated; existing ratings are kept.</p><div className="mt-3 space-y-3">{suggestions.skills.map((skill) => <label key={skill.id} className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 size-4 shrink-0 accent-primary" checked={skillIds.includes(skill.id)} onChange={() => setSkillIds(toggle(skillIds, skill.id))} /><span className="min-w-0"><span className="font-medium">{skillById[skill.id].name}</span><span className="mt-1 block break-words text-xs text-muted-foreground">“{skill.excerpt}”</span></span></label>)}</div>{!suggestions.skills.length && <p className="mt-2 text-sm text-muted-foreground">No catalogue skills matched. You can add ratings manually.</p>}</fieldset>
          <details><summary className="cursor-pointer text-sm text-primary">Review extracted text</summary><pre className="mt-3 max-h-52 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-subtle p-3 text-xs">{text.slice(0, 12000)}{text.length > 12000 ? '\n[Preview shortened]' : ''}</pre></details>
          <div className="border-t border-border pt-4"><p className="mb-3 text-xs leading-relaxed text-muted-foreground">Applying replaces the reference role and selected tasks and starts a new plan. Custom task records, existing ratings, saved routes and career preferences are kept.</p><div className="flex flex-wrap gap-3"><PButton type="submit" disabled={!roleId || !taskIds.length}>Use selected suggestions</PButton><PButton type="button" variant="ghost" onClick={close}>Discard suggestions</PButton></div></div>
        </form>}
        {!suggestions && <div className="flex flex-wrap gap-3">{!busy && <PButton variant="secondary" onClick={() => input.current?.click()}>Choose another file</PButton>}<PButton variant="ghost" onClick={close}>{busy ? 'Cancel reading' : 'Continue with manual setup'}</PButton></div>}
      </DialogContent>
    </Dialog>
  </section>
}
