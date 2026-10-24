/** @type {import('next').NextConfig} */
// Public Supabase configuration. The publishable/anon key is designed to be
// shipped to the browser (RLS protects the data); this default keeps the
// code-only Vercel deployment working without dashboard environment variables.
const FALLBACK_SUPABASE_URL = 'https://hgqspcvuoggnqqxfimpn.supabase.co'
const FALLBACK_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_0cdh8lPuLDH9V7gQFTmHDg_2dUuXoIx'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || FALLBACK_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || FALLBACK_SUPABASE_PUBLISHABLE_KEY

const nextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: supabaseKey,
  },
  images: {
    unoptimized: true,
  },
  async headers() {
    let accountOrigin = ''
    try { const url = new URL(supabaseUrl); if (url.protocol === 'https:') accountOrigin = ` ${url.origin}` } catch { /* Guest mode needs no account origin. */ }
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy-Report-Only',
            value: `default-src 'self'; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; connect-src 'self'${accountOrigin}`,
          },
        ],
      },
    ]
  },
}

export default nextConfig