import { EmptyState } from '@/components/pivott/states'
import { PLink } from '@/components/pivott/p-button'
export default function NotFound() {
  return <div className="mx-auto max-w-xl px-5 py-16"><h1 className="mb-6 text-3xl font-semibold">Page not found</h1><EmptyState title="This address has no page." action={<PLink href="/workspace">Open your work</PLink>} /></div>
}
