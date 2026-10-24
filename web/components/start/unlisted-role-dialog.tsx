'use client'
import { useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { PButton } from '@/components/pivott/p-button'
import { setState, useAppState } from '@/lib/store'
export function UnlistedRoleDialog({ open, onOpenChange, onUseOwnTasks, onReference }: { open: boolean; onOpenChange: (open: boolean) => void; onUseOwnTasks: () => void; onReference: () => void }) {
  const { state } = useAppState()
  const own = useRef(false)
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg" finalFocus={() => own.current ? document.querySelector<HTMLElement>('summary[data-add-own-task]') : document.querySelector<HTMLElement>('input[aria-label="Search for your role"]')}><DialogHeader><DialogTitle>Use your job title</DialogTitle><DialogDescription>Keep your title and choose a reference role with similar tasks, or start with your own tasks. Own tasks have no exposure estimate.</DialogDescription></DialogHeader><label className="flex flex-col gap-2 text-sm">Job title<input className="pivott-input" value={state.jobTitle} maxLength={60} autoFocus onChange={(event) => setState({ jobTitle: event.target.value })} /></label><p className="text-xs text-muted-foreground">Switching setup replaces the selected reference tasks. Existing custom tasks and skill ratings remain.</p><div className="flex flex-wrap gap-3"><PButton onClick={() => { own.current = true; onUseOwnTasks(); onOpenChange(false) }}>Use my own tasks</PButton><PButton variant="secondary" onClick={() => { own.current = false; onReference(); onOpenChange(false) }}>Choose a reference role</PButton></div></DialogContent></Dialog>
}
