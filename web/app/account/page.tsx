'use client'

import { AccountPanel } from '@/components/account/account-panel'
import { PLink } from '@/components/pivott/p-button'

export default function AccountPage() {
  return <div className="mx-auto max-w-2xl px-5 py-10"><h1 className="text-3xl font-semibold tracking-tight">Account settings</h1><AccountPanel /><PLink className="mt-6" href="/workspace" variant="secondary">Back to your work</PLink></div>
}
