const assert = require('node:assert/strict')
const { launchBrowser } = require('./helpers.cjs')
const seed = require('../../backend/app/data/seed.json')
const golden = require('../../backend/tests/golden.json')
const origin = process.env.PIVOTT_TEST_ORIGIN || 'http://localhost:3002'
;(async()=>{
 const browser=await launchBrowser();await browser.newPage()
 await Promise.all([{width:375,theme:'dark',reducedMotion:'reduce'},{width:1280,theme:'light',reducedMotion:'no-preference'}].map(async ({width,theme,reducedMotion})=>{
   const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion})
   await context.addInitScript(({seed,theme})=>{if(!localStorage.getItem('motion-fixture')){localStorage.setItem('motion-fixture','1');localStorage.setItem('pivott:v1',JSON.stringify({version:1,mode:'demo',name:seed.demoPersona.name,roleId:'finance-admin',selections:seed.tasks.filter(t=>t.roleId==='finance-admin').map(t=>({taskId:t.id,share:t.defaultShare})),skills:seed.demoPersona.skills}));localStorage.setItem('pivott:theme',theme)}},{seed,theme})
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.setDefaultTimeout(15000)
   await page.goto(origin+'/?welcome=1');await page.locator('svg[aria-labelledby="ltm-title ltm-desc"]').scrollIntoViewIfNeeded();await page.locator('svg[aria-labelledby="ltm-title ltm-desc"] [role="button"]').first().click();await page.getByRole('tooltip').waitFor()
   await page.goto(origin+'/map');await page.getByRole('radio',{name:'Fast',exact:true}).click()
   const target=`${Math.round(golden.analysisFast.roleExposure*100)}%`
   await page.waitForFunction(target=>document.querySelector('h1 [role="status"]')?.textContent===target,target)
   await page.waitForFunction(target=>document.querySelector('h1 [aria-hidden]')?.textContent===target,target)
   await page.waitForFunction(()=>JSON.parse(localStorage.getItem('pivott:v1')).scenario==='fast')
   await page.goto(origin+'/routes');await page.getByRole('radio',{name:'Normal',exact:true}).click();await page.waitForFunction(()=>document.querySelector('article h2')?.textContent==='Operations Coordinator')
   await page.getByRole('radio',{name:'Fast',exact:true}).click();await page.waitForFunction(()=>document.querySelector('article h2')?.textContent==='Finance Systems Analyst')
   await page.locator('article').first().getByText('↑ moved up',{exact:true}).waitFor();await page.locator('article').first().getByText('↑ moved up',{exact:true}).waitFor({state:'hidden',timeout:5000})
   assert.deepEqual(errors,[]);await context.close();console.log(`PASS: hero interaction, final count-up announcement, scenario rank movement and chip expiry; ${width}px/${theme}/${reducedMotion}.`)
 }))
 await browser.close()
})().catch(e=>{console.error(e);process.exit(1)})
