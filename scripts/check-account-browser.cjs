// Synthetic SDK/network fixtures only. No live project, keys or user sessions.
const assert = require('node:assert/strict')
const { launchBrowser } = require('./browser-test-helpers.cjs')
const origin = process.env.PIVOTT_TEST_ORIGIN || 'http://localhost:3003'
const fixtureProfile = { version: 1, mode: 'personal', name: 'Test profile', roleId: 'finance-admin', jobTitle: 'Device profile', taskNames: {}, careerGoal: '', savedRouteIds: [], updatedAt: '2026-10-22T08:00:00Z', selections: [{ taskId: 'fa-invoice', share: 100 }], customTasks: [], skills: { excel: 0 }, scenario: 'normal', targetRoleId: null, hoursPerWeek: 6, freeOnly: false, completedSteps: [], customSignals: [], appliedSignalIds: [], recentlyChanged: [] }
;(async () => {
 const browser = await launchBrowser()
 const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' })
 const page = await context.newPage()
 page.setDefaultTimeout(15000)
 const errors = []
 page.on('pageerror', error => errors.push(error.message))
 const user = { id: '11111111-1111-4111-8111-111111111111', email: 'fixture@example.invalid', aud: 'authenticated', role: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-10-22T00:00:00Z' }
 const expiry = Math.floor(Date.now() / 1000) + 3600
 const token = `${Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ exp: expiry, sub: user.id, aud: 'authenticated', role: 'authenticated' })).toString('base64url')}.synthetic-signature`
 await context.addInitScript(({ profile, session }) => { if (!localStorage.getItem('fixture_initialized')) { localStorage.setItem('fixture_initialized', 'yes'); localStorage.setItem('pivott:v1', JSON.stringify(profile)); localStorage.setItem('sb-pivott-account-test-auth-token', JSON.stringify(session)) } }, { profile: fixtureProfile, session: { access_token: token, refresh_token: 'synthetic-refresh', expires_at: expiry, expires_in: 3600, token_type: 'bearer', user } })
 let row = { profile: { ...fixtureProfile, jobTitle: 'Account profile', skills: { excel: 3 } }, revision: 1, updated_at: '2026-10-22T09:00:00Z' }
 let mutations = 0
 let offline = false
 let deleted = false
 await context.route('https://pivott-account-test.supabase.co/**', async route => {
   const request = route.request(), url = new URL(request.url())
   const method = request.method()
   if (offline) return route.abort('internetdisconnected')
   if (url.pathname.endsWith('/user_profiles')) {
     if (method === 'GET') return route.fulfill({ json: row ? [row] : [] })
     mutations++
     const incoming = request.postDataJSON()
     if (method === 'PATCH') {
       if (url.searchParams.get('revision') !== `eq.${row.revision}`) return route.fulfill({ json: [] })
       row = { ...row, profile: incoming.profile, revision: row.revision + 1, updated_at: new Date().toISOString() }
     } else if (method === 'POST') row = { profile: incoming.profile, revision: 1, updated_at: new Date().toISOString() }
     return route.fulfill({ json: [row] })
   }
   if (url.pathname.endsWith('/rpc/delete_own_account')) { deleted = true; row = null; return route.fulfill({ status: 204 }) }
   if (url.pathname.endsWith('/token')) return route.fulfill({ json: { access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user } })
   if (url.pathname.endsWith('/logout')) return route.fulfill({ status: 204 })
   return route.fulfill({ json: {} })
 })
 const device = () => page.evaluate(() => JSON.parse(localStorage.getItem('pivott:v1')))
 const dialog = () => page.getByRole('dialog')
 await page.goto(`${origin}/account`)
 await page.getByRole('heading', { name: 'Choose which work to keep' }).waitFor()
 assert.equal(mutations, 0)
 await page.getByRole('button', { name: 'Decide later · Continue on this device', exact: true }).click()
 await page.getByRole('button', { name: 'Save to account', exact: true }).click()
 await dialog().waitFor()
 assert.equal(mutations, 0)
 assert.equal((await device()).skills.excel, 0)
 await page.getByRole('button', { name: 'Keep this device’s profile', exact: true }).click()
 await page.getByRole('button', { name: 'Save to account', exact: true }).click()
 await page.getByRole('status').filter({ hasText: 'Saved to your account' }).waitFor()
 assert.equal(mutations, 1)
 assert.equal(row.profile.skills.excel, 0)
 // Simulate a second device saving a newer version.
 row = { ...row, revision: row.revision + 1, profile: { ...row.profile, jobTitle: 'Second device', skills: { excel: 4 } } }
 await page.getByRole('button', { name: 'Save to account', exact: true }).click()
 await page.getByRole('heading', { name: 'Choose which work to keep' }).waitFor()
 assert.equal((await device()).skills.excel, 0)
 page.once('dialog', modal => modal.accept())
 await page.getByRole('button', { name: 'Use my saved profile', exact: true }).click()
 assert.equal((await device()).skills.excel, 4)
 offline = true
 await page.getByRole('button', { name: 'Save to account', exact: true }).click()
 await page.getByRole('status').filter({ hasText: 'Couldn’t save to your account' }).waitFor()
 assert.equal((await device()).skills.excel, 4)
 offline = false
 await page.getByRole('button', { name: 'Save to account', exact: true }).click()
 await page.getByRole('status').filter({ hasText: 'Saved to your account' }).waitFor()
 page.once('dialog', modal => modal.accept())
 await page.getByRole('button', { name: 'Delete account and its saved profile', exact: true }).click()
 await page.getByRole('link', { name: 'Create account / Sign in', exact: true }).waitFor()
 assert(deleted)
 assert.equal((await device()).skills.excel, 4)
 // Email form can request/resend without uploading any profile.
 await page.goto(`${origin}/signin?next=/pathway`)
 await page.getByLabel('Email address').fill('fixture@example.invalid')
 await page.getByRole('button', { name: 'Send sign-in link', exact: true }).click()
 await page.getByRole('status').filter({ hasText: 'Check your email' }).waitFor()
 assert(await page.getByRole('button', { name: /Resend available in/ }).isDisabled())
 assert.equal((await device()).skills.excel, 4)
 await page.goto(`${origin}/signin?code=synthetic-code&next=/pathway`)
 await page.waitForURL(url => url.pathname === '/pathway')
 assert.equal((await device()).skills.excel, 4)
 await page.goto(`${origin}/account`)
 await page.getByRole('button', { name: 'Sign out · Keep device work', exact: true }).click()
 await page.getByRole('link', { name: 'Create account / Sign in', exact: true }).waitFor()
 assert.equal((await device()).skills.excel, 4)
 assert.deepEqual(errors, [])
 console.log('PASS (mocked Supabase network): existing-account conflict, defer does not authorize save, explicit device upload, stale-revision conflict, account restore, offline failure/retry, own-account deletion preserves device work, email request/resend cooldown, callback return path and sign-out. Live Supabase/email not tested.')
 await browser.close()
})().catch(error => { console.error(error); process.exit(1) })
