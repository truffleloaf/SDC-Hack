'use client'

import Link from 'next/link'
import { useSignIn } from '@/components/account/sign-in-dialog'
import { useAccount } from '@/components/account/account-provider'
import { usePathname, useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { LogOut, Moon, MoreHorizontal, PenLine, RotateCcw, Sun, Trash2, UserRound } from 'lucide-react'
import { useState, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { hasDemoPersona } from '@/lib/data/seed'
import { clearAllData, displayName, enterDemo, exitDemo, useAppState } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Logo } from './logo'
import { NameField } from './name-field'
import { PButton, pButton } from './p-button'

const noop = () => () => {}

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const mounted = useSyncExternalStore(noop, () => true, () => false)
  const dark = mounted && resolvedTheme === 'dark'
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
      className={pButton({ variant: 'ghost', size: 'icon-sm' })}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? <Sun aria-hidden /> : <Moon aria-hidden />}
    </button>
  )
}

function ProfileButton({ onClick }: { onClick: () => void }) {
  const { state, hydrated } = useAppState()
  const name = hydrated ? displayName(state) : ''
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={name ? `Display name: ${name}. Edit` : 'Add your display name'}
      className={cn(pButton({ variant: 'ghost', size: 'sm' }), 'h-9 max-w-[9.5rem] gap-2 px-1.5 sm:pr-3')}
    >
      <span
        aria-hidden
        className="grid size-6 shrink-0 place-items-center rounded-full bg-mint font-mono text-[11px] font-medium uppercase text-teal-strong dark:text-primary"
      >
        {name ? name.charAt(0) : <UserRound className="size-3.5" />}
      </span>
      <span className="hidden truncate sm:inline">{name || 'Add name'}</span>
    </button>
  )
}

export function SiteHeader() {
  const pathname = usePathname()
  const account = useAccount()
  const { openSignIn } = useSignIn()
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const { state } = useAppState()

  async function deleteData() {
    await account.signOut(true)
    if (!clearAllData()) throw new Error("Couldn’t delete browser storage. Check your browser settings and retry.")
    setConfirmOpen(false)
    toast.success('Device work deleted. Signed out on this device.')
    router.push('/')
  }

  return (
    <>
      <header className="sticky top-0 z-40 bg-background border-b border-border px-3 sm:px-5">
        <nav
          aria-label="Main"
          className="mx-auto flex h-18 w-full max-w-[1200px] flex-nowrap items-center justify-between gap-x-3 gap-y-1 py-2"
        >
          <Link href="/?welcome=1" className="rounded-lg" aria-label="Pivott home">
            <Logo />
          </Link>
          <div className="ml-auto flex min-w-0 flex-nowrap items-center justify-end gap-1">
            <Link href="/workspace" className={cn(pButton({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}>Your work</Link>
            {account.user ? <DropdownMenu><DropdownMenuTrigger aria-label="Account menu" className={cn(pButton({ variant: 'ghost', size: 'icon-sm' }), 'rounded-full border border-border')}>{account.user.email?.charAt(0).toUpperCase() || 'A'}</DropdownMenuTrigger><DropdownMenuContent align="end" className="max-w-[calc(100vw-2rem)]"><p className="break-words px-3 py-2 text-sm">{account.user.email}</p><p role="status" className="px-3 pb-2 text-xs text-muted-foreground">{account.status}</p><DropdownMenuItem onClick={() => router.push('/account')}>Account</DropdownMenuItem><DropdownMenuItem onClick={() => void account.signOut()}>Sign out</DropdownMenuItem></DropdownMenuContent></DropdownMenu> : account.configured && <button onClick={() => openSignIn(pathname)} className={pButton({ variant: 'ghost', size: 'sm' })}>Sign in</button>}
            <Link href="/signals" className={cn(pButton({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex', pathname === '/signals' && 'bg-subtle text-foreground')}>Signals</Link>
            <span className="hidden sm:contents"><ProfileButton onClick={() => setNameOpen(true)} /></span>
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                className={pButton({ variant: 'ghost', size: 'icon-sm' })}
                aria-label="More options"
              >
                <MoreHorizontal aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem className="sm:hidden" onClick={() => router.push('/workspace')}>Your work</DropdownMenuItem>
                <DropdownMenuItem className="sm:hidden" onClick={() => router.push('/signals')}>Signals</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/account')}>Saving and backups</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setNameOpen(true)}>
                  <PenLine aria-hidden />
                  Edit display name
                </DropdownMenuItem>
                {hasDemoPersona && (state.mode === 'demo' ? (
                  <DropdownMenuItem
                    onClick={() => {
                      exitDemo()
                      toast.success('Back to your own profile')
                      router.push('/start')
                    }}
                  >
                    <LogOut aria-hidden />
                    Exit demo profile
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onClick={() => {
                      enterDemo()
                      toast.success('Loaded Aisyah’s demo profile')
                      router.push('/map')
                    }}
                  >
                    <UserRound aria-hidden />
                    Load demo profile
                  </DropdownMenuItem>
                ))}
                {hasDemoPersona && <DropdownMenuItem
                  onClick={() => {
                    enterDemo()
                    toast('Demo profile reset. Your personal work is kept.')
                    router.push('/map')
                  }}
                >
                  <RotateCcw aria-hidden />
                  Reset demo
                </DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <Trash2 aria-hidden />
                  Delete my data on this device
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </header>

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">What should we call you?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Your name appears on your passport. It stays on this device for guests and syncs with your profile when signed in.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              setNameOpen(false)
            }}
          >
            <NameField label="Display name" />
            <DialogFooter className="mt-4 bg-subtle">
              <PButton type="submit">Done</PButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Delete data on this device</DialogTitle>
            <DialogDescription className="leading-relaxed">
              This removes the device profile, progress, backups and sign-in session. Your saved account copy remains. Delete the account separately in Account settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-subtle">
            <PButton variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep my data
            </PButton>
            <PButton onClick={deleteData} className="bg-destructive text-card">
              <Trash2 aria-hidden />
              Delete my data on this device
            </PButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
