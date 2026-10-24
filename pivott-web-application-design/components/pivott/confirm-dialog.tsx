'use client'
import { useEffect, useId, useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PButton } from './p-button'
export function ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, onConfirm, requiredText, destructive = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; confirmLabel: string;
  onConfirm: () => void | boolean | Promise<void | boolean>; requiredText?: string; destructive?: boolean;
}) {
  const [typed, setTyped] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const id = useId()
  useEffect(() => { if (!open) { setTyped(''); setError('') } }, [open])
  return <Dialog open={open} onOpenChange={(value) => !busy && onOpenChange(value)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader><form onSubmit={async (event) => {
    event.preventDefault(); if (busy || (requiredText && typed !== requiredText)) return
    setBusy(true); setError('')
    try { const result = await onConfirm(); if (result !== false) onOpenChange(false); else setError('This could not be completed. Check the connection and try again.') }
    catch { setError('This could not be completed. Try again.') }
    finally { setBusy(false) }
  }}>{requiredText && <label className="mb-4 flex flex-col gap-2 text-sm">Type {requiredText} to confirm<input className="pivott-input" value={typed} autoComplete="off" autoFocus aria-describedby={error ? id : undefined} onChange={(event) => setTyped(event.target.value)} /></label>}{error && <p id={id} role="alert" className="mb-4 text-sm text-destructive">{error}</p>}<DialogFooter><PButton type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</PButton><PButton type="submit" loading={busy} disabled={!!requiredText && typed !== requiredText} className={destructive ? 'bg-destructive text-white dark:text-background' : undefined}>{confirmLabel}</PButton></DialogFooter></form></DialogContent></Dialog>
}
