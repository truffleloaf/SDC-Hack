/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  async headers() {
    let accountOrigin = ''
    try { const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || ''); if (url.protocol === 'https:') accountOrigin = ` ${url.origin}` } catch { /* Guest mode needs no account origin. */ }
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
