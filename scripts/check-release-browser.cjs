const assert = require('node:assert/strict')
const { launchBrowser } = require('./browser-test-helpers.cjs')
const AxeBuilder = require(process.env.AXE_PLAYWRIGHT_MODULE || '@axe-core/playwright').default
const base = process.env.PIVOTT_BASE_URL || 'http://127.0.0.1:3000'

async function run() {
  const browser = await launchBrowser()
  await browser.newPage()
  const context = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, reducedMotion: 'reduce' })
  await context.addInitScript(() => {
    window.__pivottVitals = { lcp: 0, cls: 0 }
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__pivottVitals.lcp = entry.startTime }).observe({ type: 'largest-contentful-paint', buffered: true }) } catch {}
    try { new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__pivottVitals.cls += entry.value }).observe({ type: 'layout-shift', buffered: true }) } catch {}
  })
  const page = await context.newPage()
  const browserErrors = []
  page.on('pageerror', error => browserErrors.push(error.message))
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: 'Essential only' }).click()
  assert.equal(await page.locator('.landing-hero a.bg-primary').count(), 1, 'Homepage hero should have one primary call to action')
  assert.equal(await page.getByRole('link', { name: /Map my work/ }).count(), 1)
  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0]
    const resources = performance.getEntriesByType('resource')
    return { ttfb: nav.responseStart, domContentLoaded: nav.domContentLoadedEventEnd, lcp: window.__pivottVitals.lcp, cls: window.__pivottVitals.cls, requests: resources.length + 1, transferBytes: resources.reduce((sum, entry) => sum + (entry.transferSize || 0), nav.transferSize || 0) }
  })
  assert(metrics.ttfb < 1200, `Local production TTFB ${metrics.ttfb}ms exceeds 1200ms budget`)
  assert(metrics.domContentLoaded < 2500, `DOMContentLoaded ${metrics.domContentLoaded}ms exceeds 2500ms budget`)
  assert(metrics.lcp === 0 || metrics.lcp < 3000, `LCP ${metrics.lcp}ms exceeds 3000ms budget`)
  assert(metrics.cls < 0.1, `CLS ${metrics.cls} exceeds 0.1 budget`)
  assert(metrics.requests <= 45, `${metrics.requests} first-load requests exceeds 45 request budget`)
  assert(metrics.transferBytes <= 2_000_000, `${metrics.transferBytes} bytes exceeds 2MB first-load budget`)

  for (const path of ['/privacy', '/terms', '/jobs', '/signin', '/missing-release-check']) {
    const response = await page.goto(`${base}${path}`, { waitUntil: 'networkidle' })
    if (path.includes('missing')) assert.equal(response.status(), 404)
    const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }))
    assert(width.document <= width.viewport + 1, `${path} overflows mobile viewport: ${JSON.stringify(width)}`)
    const violations = (await new AxeBuilder({ page }).analyze()).violations.filter(item => ['serious', 'critical'].includes(item.impact))
    assert.deepEqual(violations.map(item => `${item.id}: ${item.help}`), [], `${path} accessibility violations`)
  }
  await page.goto(`${base}/signin?next=%2F`, { waitUntil: 'networkidle' })
  assert.equal(await page.getByRole('button', { name: 'Sign in with password' }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Create an account' }).count(), 1)
  assert.equal(await page.getByRole('button', { name: 'Forgot password?' }).count(), 1)
  let jobChecks = 0
  const originalJob = { id:'release-fixture', roleId:'software-developer', title:'Software Developer', company:'Fixture company', location:'Kuala Lumpur, Malaysia', url:'https://example.invalid/job', postedAt:'2026-10-24', remote:false, tags:['Engineering'] }
  await page.route('**/api/live/jobs?refresh=1', route => {
    jobChecks++
    const postings = jobChecks === 1 ? [originalJob] : [{ ...originalJob, location:'Penang, Malaysia' }, { ...originalJob, id:'release-fixture-new', title:'Frontend Developer', url:'https://example.invalid/new' }]
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ asOf:'2026-10-24', postings }) })
  })
  await page.goto(`${base}/jobs`, { waitUntil: 'networkidle' })
  assert.equal(await page.getByLabel('Work arrangement').count(), 1)
  await page.getByRole('button', { name: 'Customize job updates' }).click()
  assert.equal(await page.getByRole('checkbox', { name:'Enable job updates' }).count(), 1)
  assert.equal(await page.getByRole('checkbox').count() >= 21, true)
  await page.getByRole('checkbox', { name:'Enable job updates' }).check()
  await page.getByRole('button', { name:'Save preferences' }).click()
  await page.getByText(/1 matching listing in the latest feed/).waitFor()
  await page.getByRole('button', { name:'Check now' }).click()
  await page.getByText('New listing', { exact:true }).waitFor()
  await page.getByText('Listing changed', { exact:true }).waitFor()
  const notificationViolations = (await new AxeBuilder({ page }).analyze()).violations.filter(item => ['serious', 'critical'].includes(item.impact))
  assert.deepEqual(notificationViolations.map(item => `${item.id}: ${item.help}`), [])
  await page.getByRole('button', { name:'Close' }).click()
  assert.equal(await page.getByRole('button', { name:/Job updates, 2 unread/ }).count(), 1)
  await page.getByRole('button', { name: 'Refresh public listings' }).click()
  await page.getByText('Place', { exact: true }).first().waitFor()
  assert.equal(await page.getByText('Place', { exact: true }).first().isVisible(), true)
  assert.deepEqual(browserErrors, [])
  await context.close(); await browser.close()
  console.log(`PASS: mobile/legal/auth/job notifications/jobs/404/accessibility and performance budgets ${JSON.stringify(metrics)}`)
}
run().catch(error => { console.error(error); process.exitCode = 1 })
