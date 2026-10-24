'use client'

import { Check, Copy } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { pButton } from './p-button'

export function CopyButton({
  text,
  label = 'Copy',
  className,
  iconOnly = false,
  toastMessage = 'Copied to clipboard',
}: {
  text: string
  label?: string
  className?: string
  iconOnly?: boolean
  toastMessage?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success(toastMessage)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      toast.error('Couldn’t access the clipboard')
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={iconOnly ? label : undefined}
      className={cn(pButton({ variant: 'secondary', size: iconOnly ? 'icon-sm' : 'sm' }), className)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={copied ? 'y' : 'n'}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.6, opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="inline-flex"
        >
          {copied ? <Check className="text-primary" aria-hidden /> : <Copy aria-hidden />}
        </motion.span>
      </AnimatePresence>
      {!iconOnly && <span>{copied ? 'Copied' : label}</span>}
    </button>
  )
}
