import { AccountProvider } from '@/components/account/account-provider'
import { Analytics } from '@vercel/analytics/next'
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

export const metadata: Metadata = {
  title: 'Pivott — Map the tasks. Route the skills.',
  description:
    'Explore illustrative task exposure, compare possible roles, and build a learning plan. Guest use is available; optional account saving is explicit.',
  icons: { icon: '/icon.svg' },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F8FAF9' },
    { media: '(prefers-color-scheme: dark)', color: '#0E1A1C' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${plex.variable} bg-background`}
    >
      <body className="min-h-dvh font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem storageKey="pivott:theme">
          <AccountProvider><TooltipProvider delay={150}>
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
            <Toaster
              position="bottom-center"
              toastOptions={{
                className: '!rounded-2xl !border-border !bg-card !text-foreground !shadow-lift !font-sans',
              }}
            />
          </TooltipProvider></AccountProvider>
        </ThemeProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
