'use client'

import Link from 'next/link'
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
  const router = useRouter()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [nameOpen, setNameOpen] = useState(false)
  const { state } = useAppState()

  function deleteData() {
    clearAllData()
    setConfirmOpen(false)
    toast.success('Your data has been deleted from this browser')
    router.push('/')
  }

  return (
    <>
      <header className="sticky top-0 z-40 px-3 pt-3 sm:px-5">
        <nav
          aria-label="Main"
          className="mx-auto flex h-14 bg-card/85 backdrop-blur-xl backdrop-saturate-150 w-full max-w-[1200px] items-center justify-between rounded-2xl border border-border/80 pl-4 pr-2 shadow-soft"
        >
          <Link href="/" className="rounded-lg" aria-label="Pivott home">
            <Logo animated={pathname === '/'} />
          </Link>
          <div className="flex items-center gap-1">
            <Link
              href="/signals"
              className={cn(
                pButton({ variant: 'ghost', size: 'sm' }),
                pathname === '/signals' && 'bg-subtle text-foreground',
              )}
            >
              Signals
            </Link>
            <ProfileButton onClick={() => setNameOpen(true)} />
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger
                className={pButton({ variant: 'ghost', size: 'icon-sm' })}
                aria-label="More options"
              >
                <MoreHorizontal aria-hidden />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setNameOpen(true)}>
                  <PenLine aria-hidden />
                  Edit display name
                </DropdownMenuItem>
                {state.mode === 'demo' ? (
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
                )}
                <DropdownMenuItem
                  onClick={() => {
                    clearAllData()
                    toast('Demo reset to a fresh start')
                    router.push('/start')
                  }}
                >
                  <RotateCcw aria-hidden />
                  Reset demo
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setConfirmOpen(true)}>
                  <Trash2 aria-hidden />
                  Delete my data
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </nav>
      </header>

      <Dialog open={nameOpen} onOpenChange={setNameOpen}>
        <DialogContent className="rounded-[20px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">What should we call you?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              Your name personalises your map, pathway, and Skill Passport. It never leaves this browser.
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
        <DialogContent className="rounded-[20px] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl font-normal">Delete your data?</DialogTitle>
            <DialogDescription className="leading-relaxed">
              This clears your job, tasks, skills, pathway progress, and any signals you added from this browser. Nothing is stored on a server.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="bg-subtle">
            <PButton variant="ghost" onClick={() => setConfirmOpen(false)}>
              Keep my data
            </PButton>
            <PButton onClick={deleteData} className="bg-destructive text-card">
              <Trash2 aria-hidden />
              Delete my data
            </PButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
