#!/usr/bin/env node
/**
 * Refresh the committed live snapshot used by the code-only Vercel build.
 *
 * Start the root FastAPI in live mode, then:
 *   node scripts/export-live-seed.mjs
 *   node scripts/export-live-seed.mjs http://127.0.0.1:8001
 *
 * The output files are:
 *   pivott-web-application-design/lib/data/live-seed.json
 *   pivott-web-application-design/lib/data/live-meta.json
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const base = (process.argv[2] || process.env.PIVOTT_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://127.0.0.1:8001').replace(/\/+$/, '')
const root = dirname(dirname(fileURLToPath(import.meta.url)))
const outDir = join(root, 'pivott-web-application-design', 'lib', 'data')

async function get(path) {
  const response = await fetch(`${base}${path}`)
  if (!response.ok) throw new Error(`${path} -> ${response.status}`)
  return response.json()
}

const seed = await get('/api/seed')
if (!Array.isArray(seed.roles) || !Array.isArray(seed.tasks) || !Array.isArray(seed.skills)) {
  throw new Error('Unexpected /api/seed shape')
}
if (seed.demoPersona != null) throw new Error('This is a demo catalogue; start FastAPI with PIVOTT_DATASET=live')
const meta = await get('/api/live/status')

await mkdir(outDir, { recursive: true })
await writeFile(join(outDir, 'live-seed.json'), `${JSON.stringify(seed, null, 2)}\n`)
await writeFile(join(outDir, 'live-meta.json'), `${JSON.stringify(meta, null, 2)}\n`)
console.log(`wrote live snapshot: ${seed.roles.length} roles, ${seed.tasks.length} tasks, ${seed.skills.length} skills, ${meta.counts?.postings ?? 0} postings`)