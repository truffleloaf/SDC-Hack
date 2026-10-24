const assert=require('node:assert/strict')
const fs=require('node:fs')
const {launchBrowser}=require('./browser-test-helpers.cjs')
const {default:AxeBuilder}=require(process.env.AXE_PLAYWRIGHT_MODULE || '@axe-core/playwright')
const origin=process.env.PIVOTT_TEST_ORIGIN || 'http://localhost:3002'
;(async()=>{
 fs.mkdirSync('/tmp/pivott-domain1-screenshots',{recursive:true})
 const browser=await launchBrowser();await browser.newPage()
 const seed=await (await fetch(origin+'/api/seed')).json();assert.equal(seed.roles.length,10);assert.equal(seed.skills.length,17);assert.equal(seed.sdgs.length,17);assert.equal(seed.scenarios.length,3)
 for(const [width,theme] of [[375,'light'],[375,'dark'],[1280,'light'],[1280,'dark']]){
  const context=await browser.newContext({viewport:{width,height:1000},hasTouch:true,colorScheme:theme,reducedMotion:'reduce'})
  await context.addInitScript(theme=>localStorage.setItem('pivott:theme',theme),theme)
  const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message))
  await page.goto(origin+'/example');await page.waitForURL('**/map');await page.getByRole('heading',{level:1}).waitFor()
  assert((await page.locator('body').innerText()).includes('Sample profile, not a real person'))
  for(const route of ['/','/start','/map','/routes','/pathway','/passport','/signals','/jobs','/method']){
   await page.goto(origin+route);await page.getByRole('heading',{level:1}).waitFor();await page.evaluate(()=>document.fonts.ready)
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Overflow ${route} ${width}/${theme}`)
   await page.waitForFunction(()=>[...document.querySelectorAll('article')].every(a=>{for(let el=a;el&&el!==document.body;el=el.parentElement)if(Number(getComputedStyle(el).opacity)<.999)return false;return true}))
   const audit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`Axe ${route} ${width}/${theme}`)
   if(route==='/routes'){
    await page.getByLabel('Show routes').selectOption('5');await page.waitForFunction(()=>document.querySelectorAll('article[aria-labelledby^="route-"]').length===5)
    await page.getByLabel(/9\. Industry/).check();await page.getByText(/SDG focus applied/).waitFor()
    await page.getByLabel('Ignore trend signals').check();await page.getByRole('heading',{name:'Slow / Normal / Fast'}).waitFor()
   }
   if(route==='/jobs'){
    await page.getByLabel('Title, company or keyword').fill('sample test');assert((await page.locator('body').innerText()).includes('No posting records'))
    await page.getByRole('button',{name:'Reset filters'}).click()
    const fixture={id:'synthetic-browser-fixture',roleId:'accountant',title:'Synthetic browser listing',company:'Fixture company',location:'Fixture location',url:'https://example.invalid/job',postedAt:'2026-10-24',remote:true,tags:[]}
    await page.route('**/api/live/jobs?refresh=1',route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({asOf:'2026-10-24',postings:[fixture]})}))
    await page.getByRole('button',{name:'Get latest public listings'}).click();await page.getByRole('link',{name:fixture.title}).waitFor()
    await page.unroute('**/api/live/jobs?refresh=1')
    await page.route('**/api/live/jobs?refresh=1',route=>route.fulfill({status:503,contentType:'application/json',body:'{}'}))
    await page.getByRole('button',{name:'Get latest public listings'}).click();await page.getByRole('alert').waitFor()
    assert.equal(await page.getByRole('link',{name:fixture.title}).count(),1)
   }
   await page.screenshot({path:`/tmp/pivott-domain1-screenshots/${route.slice(1)||'home'}-${width}-${theme}.png`,fullPage:true})
   console.log(`PASS ${route} ${width}px ${theme}`)
  }
  assert.deepEqual(errors,[]);await context.close()
 }
 await browser.close();console.log('PASS live catalogue, sample isolation labels, scenario/SDG/route controls, jobs filters, Axe and layout')
})().catch(e=>{console.error(e);process.exit(1)})
