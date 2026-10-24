// Parse source so comments and operators are not mistaken for UI prose.
import { createRequire } from 'node:module'
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import assert from 'node:assert/strict'
const root = fileURLToPath(new URL('../../', import.meta.url))
const require = createRequire(join(root, 'web/package.json'))
const ts = require('typescript')
const phrases = /\b(?:seamless|unlock|elevate|empower|journey|leverage|tailored|robust|streamline|delve|let's|it's not|isn't just)\b/i

export function checkCopy(text, name = 'fixture.tsx') {
  const source = ts.createSourceFile(name, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const lines = text.split(/\r?\n/)
  const issues = []
  function report(node, message) {
    const { line, character } = source.getLineAndCharacterOfPosition(node.getStart(source))
    if ([lines[line], lines[line - 1]].some(value => /\/\/\s*copy-lint-ok:\s*\S/.test(value || ''))) return
    issues.push({ line: line + 1, column: character + 1, message })
  }
  function visit(node) {
    if (ts.isJsxText(node) || ts.isStringLiteralLike(node) || [ts.SyntaxKind.TemplateHead, ts.SyntaxKind.TemplateMiddle, ts.SyntaxKind.TemplateTail].includes(node.kind)) {
      const value = node.text.trim().replaceAll('’', "'")
      if (value.length > 3 && value.includes('—')) report(node, 'Use a sentence or comma instead of a prose em dash.')
      const hit = value.match(phrases)
      if (hit) report(node, `Replace the phrase “${hit[0]}” with a specific description.`)
    }
    if (ts.isCallExpression(node)) {
      const call = node.expression
      let method
      if (ts.isIdentifier(call)) method = call.text
      else if ((ts.isPropertyAccessExpression(call) || ts.isElementAccessExpression(call)) && ['window', 'globalThis'].includes(call.expression.getText(source))) method = ts.isPropertyAccessExpression(call) ? call.name.text : call.argumentExpression?.text
      if (['confirm', 'alert', 'prompt'].includes(method)) report(node, `Use an accessible dialog instead of ${method}().`)
    }
    ts.forEachChild(node, visit)
  }
  visit(source)
  return issues
}
function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const name = join(directory, entry.name)
    if (entry.isDirectory()) return entry.name === 'styleguide' ? [] : files(name)
    return /\.[jt]sx?$/.test(name) ? [name] : []
  })
}
if (process.argv.includes('--self-test')) {
  for (const sample of ['<p>Plan — steps</p>', 'const x = "Unlock your potential"', 'const x = `Let’s begin`', 'window.confirm("Delete?")', 'alert("Hi")', "window['prompt']('Name')"]) assert(checkCopy(sample).length > 0, sample)
  for (const sample of ['<p>Task map</p>', 'const empty = "—"', '// unlock — is a developer comment\nconst n = 1', '// copy-lint-ok: deliberate example\nconst x = "Unlock"']) assert.equal(checkCopy(sample).length, 0, sample)
  console.log('PASS: copy lint detects prose and native prompts, permits placeholders and reasoned exceptions.')
} else {
  const problems = files(join(root, 'web/app')).concat(files(join(root, 'web/components'))).flatMap(name => checkCopy(readFileSync(name, 'utf8'), name).map(issue => `${relative(root, name)}:${issue.line}:${issue.column} ${issue.message}`))
  if (problems.length) { console.error(problems.join('\n')); process.exitCode = 1 }
  else console.log('PASS: UI copy and dialog checks.')
}
