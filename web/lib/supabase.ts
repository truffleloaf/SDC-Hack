import { createClient, type SupabaseClient } from '@supabase/supabase-js'
let client: SupabaseClient | null = null
function validConfiguration() {
  try { const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || ''); return !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && (url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname))) } catch { return false }
}
export const accountSavingConfigured = validConfiguration()
const boundedFetch: typeof fetch = async (input, init) => {
  const controller = new AbortController()
  const abort = () => controller.abort()
  if (init?.signal?.aborted) abort()
  init?.signal?.addEventListener('abort', abort, { once: true })
  const timeout = setTimeout(abort, 15000)
  try { return await fetch(input, { ...init, signal: controller.signal }) }
  finally { clearTimeout(timeout); init?.signal?.removeEventListener('abort', abort) }
}
export function getSupabase() {
  if (!accountSavingConfigured) return null
  try { client ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    global: { fetch: boundedFetch },
    auth: { flowType: 'pkce', persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  })
  return client } catch { return null }
}
