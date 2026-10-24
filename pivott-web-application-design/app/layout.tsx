import { MotionProvider } from '@/components/pivott/motion-provider'
import { CatalogBoot } from '@/components/pivott/catalog-boot'
import { getCatalog } from '@/lib/catalog'
import { AccountProvider } from '@/components/account/account-provider'
import { ConsentControls, CookieSettingsButton } from '@/components/privacy/consent-controls'
import type { Metadata, Viewport } from 'next'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'
import { SiteHeader } from '@/components/pivott/site-header'
import { DemoBanner } from '@/components/pivott/demo-banner'
import { RouteStepper } from '@/components/pivott/route-stepper'
import { TooltipProvider } from '@/components/ui/tooltip'
import localFont from 'next/font/local'
import './globals.css'

const plex = localFont({
  src: [
    { path: '../public/fonts/ibm-plex-sans-latin-400-normal.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/ibm-plex-sans-latin-500-normal.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/ibm-plex-sans-latin-600-normal.woff2', weight: '600', style: 'normal' },
    { path: '../public/fonts/ibm-plex-sans-latin-700-normal.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-plex', display: 'swap',
})

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://pivottstudio.vercel.app'),
  title: 'Pivott: see which parts of your job AI could take on',
  description:
    'Map your tasks, compare nearby roles and make a study plan. Start on this device or sign in to sync your plan.',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1A1C' },
  ],
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const catalog = await getCatalog()
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plex.variable} bg-background`}
    >
      <body className="min-h-dvh font-sans antialiased">
        <CatalogBoot payload={catalog}><ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="pivott:theme">
          <MotionProvider><AccountProvider><TooltipProvider delay={150}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-card focus:px-3 focus:py-2"
            >
              Skip to content
            </a>
            <SiteHeader />
            <DemoBanner />
            <RouteStepper />
            <main id="main">{children}</main>
            <footer className="mx-auto flex max-w-[1200px] flex-col gap-3 border-t border-border px-5 py-8 pb-28 text-sm text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:pb-8"><span className="font-medium text-foreground">Pivott</span><nav aria-label="Footer" className="flex flex-wrap items-center gap-x-5 gap-y-1"><a href="/method" className="inline-flex min-h-11 items-center underline">How scores work</a><a href="/privacy" className="inline-flex min-h-11 items-center underline">Privacy</a><a href="/terms" className="inline-flex min-h-11 items-center underline">Terms</a><CookieSettingsButton /></nav></footer>
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: '!rounded-2xl !border-border !bg-card !text-foreground !shadow-lift !font-sans',
              }}
            />
          </TooltipProvider></AccountProvider></MotionProvider>
        </ThemeProvider></CatalogBoot>
        <ConsentControls />
      </body>
    </html>
  )
}
