#!/usr/bin/env node

// Check relative links and images in tracked Markdown without external requests.
import { existsSync, readFileSync, statSync } from 'node:fs'
import { dirname, extname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const root = resolve(fileURLToPath(new URL('../../', import.meta.url)))
const markdownFiles = execFileSync('git', ['ls-files', '-z', '*.md'], { cwd: root })
  .toString()
  .split('\0')
  .filter(Boolean)

function slug(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~]/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function anchorsFor(path) {
  const counts = new Map()
  const anchors = new Set()
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)
    if (!heading) continue
    const base = slug(heading[1])
    const count = counts.get(base) ?? 0
    counts.set(base, count + 1)
    anchors.add(count ? `${base}-${count}` : base)
  }
  return anchors
}

const failures = []
for (const relativeFile of markdownFiles) {
  const absoluteFile = resolve(root, relativeFile)
  const text = readFileSync(absoluteFile, 'utf8')
  const targets = []
  for (const match of text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) targets.push(match[1])
  for (const match of text.matchAll(/^\[[^\]]+\]:\s*(\S+)/gm)) targets.push(match[1])

  for (let rawTarget of targets) {
    rawTarget = rawTarget.trim().replace(/^<|>$/g, '')
    const target = rawTarget.split(/\s+["']/)[0]
    if (!target || /^(?:https?:|mailto:|tel:|data:)/i.test(target)) continue

    const [rawPath, rawFragment] = target.split('#', 2)
    let decodedPath
    try { decodedPath = decodeURIComponent(rawPath) } catch { failures.push(`${relativeFile}: invalid URL encoding in ${target}`); continue }
    const linkedPath = decodedPath ? resolve(dirname(absoluteFile), decodedPath) : absoluteFile
    if (linkedPath !== root && !linkedPath.startsWith(root + sep)) {
      failures.push(`${relativeFile}: link escapes the repository: ${target}`)
      continue
    }
    if (!existsSync(linkedPath)) {
      failures.push(`${relativeFile}: missing ${target}`)
      continue
    }
    if (rawFragment && statSync(linkedPath).isFile() && extname(linkedPath).toLowerCase() === '.md') {
      let fragment
      try { fragment = decodeURIComponent(rawFragment).toLowerCase() } catch { failures.push(`${relativeFile}: invalid anchor encoding in ${target}`); continue }
      if (!anchorsFor(linkedPath).has(fragment)) failures.push(`${relativeFile}: missing anchor #${rawFragment} in ${decodedPath || relativeFile}`)
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log(`PASS: ${markdownFiles.length} tracked Markdown files have valid relative links and image paths.`)
