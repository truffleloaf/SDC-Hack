import type { Metadata } from 'next'
import { PageIntro } from '@/components/pivott/route-stepper'
import { StyleguideDemo } from '@/components/styleguide/styleguide-demo'

export const metadata: Metadata = {
  title: 'Styleguide · Pivott',
  robots: { index: false, follow: false },
}

export default function StyleguidePage() {
  return (
    <div className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-10">
      <PageIntro eyebrow="Internal" title="Pivott component library" className="mb-10" />
      <StyleguideDemo />
    </div>
  )
}
