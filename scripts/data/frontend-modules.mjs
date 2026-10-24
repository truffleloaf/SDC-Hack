// Load the repository's TypeScript engine for maintenance scripts, without new tools.
import { createRequire } from 'node:module'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export function loadFrontendModules() {
  const root = fileURLToPath(new URL('../../', import.meta.url))
  const require = createRequire(join(root, 'web/package.json'))
  const ts = require('typescript')
  const temporary = mkdtempSync(join(tmpdir(), 'pivott-engine-'))
  try {
    for (const name of ['data/seed', 'engine']) {
      const source = readFileSync(join(root, 'web/lib', `${name}.ts`), 'utf8')
      const target = join(temporary, `${name}.js`)
      mkdirSync(dirname(target), { recursive: true })
      writeFileSync(target, ts.transpileModule(source, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true, resolveJsonModule: true },
      }).outputText)
    }
    writeFileSync(join(temporary,'data/sdg-map.json'), readFileSync(join(root,'web/lib/data/sdg-map.json')))
    writeFileSync(join(temporary,'data/resources.live.json'), readFileSync(join(root,'web/lib/data/resources.live.json')))
    return { seed: require(join(temporary, 'data/seed.js')), engine: require(join(temporary, 'engine.js')) }
  } finally {
    rmSync(temporary, { recursive: true, force: true })
  }
}
