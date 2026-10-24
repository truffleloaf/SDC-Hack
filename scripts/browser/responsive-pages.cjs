const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { launchBrowser } = require('./helpers.cjs')
const AxeBuilder = require(process.env.AXE_PLAYWRIGHT_MODULE || '@axe-core/playwright').default
const seed = require('../../backend/app/data/seed.json')
const origin = process.env.PIVOTT_TEST_ORIGIN || 'http://localhost:3002'
const out = process.env.PIVOTT_SCREENSHOT_DIR || '/tmp/pivott-briefs-screenshots'
const profile = { version:1,mode:'personal',name:'Sample',jobTitle:'Accounts Executive',taskNames:{},careerGoal:'',savedRouteIds:[],updatedAt:null,roleId:'finance-admin',selections:seed.tasks.filter(t=>t.roleId==='finance-admin').map(t=>({taskId:t.id,share:t.defaultShare})),customTasks:[],resumeSkillIds:[],skills:seed.demoPersona.skills,scenario:'normal',targetRoleId:'finance-systems-analyst',hoursPerWeek:6,freeOnly:false,completedSteps:[],customSignals:[],appliedSignalIds:[],recentlyChanged:[] }
;(async()=>{
 fs.mkdirSync(out,{recursive:true})
 const issues=[]
 const browser=await launchBrowser();await browser.newPage()
 await Promise.all([375,1280].flatMap(width=>['light','dark'].map(theme=>({width,theme}))).map(async ({width,theme})=>{
   const context=await browser.newContext({viewport:{width,height:1000},colorScheme:theme,reducedMotion:'reduce'})
   await context.addInitScript(({profile,theme})=>{if(!localStorage.getItem('brief-test')){localStorage.setItem('pivott:v1',JSON.stringify(profile));localStorage.setItem('brief-test','1')}localStorage.setItem('pivott:theme',theme)},{profile,theme})
   const page=await context.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(e.message))
   for(const route of (process.argv.includes('--map-only') ? ['/map'] : ['/?welcome=1','/start','/skills','/map','/routes','/pathway','/passport','/signals','/method','/account','/workspace','/page-that-does-not-exist'])){
     await page.goto(origin+route);await page.locator('h1').first().waitFor();await page.evaluate(()=>document.fonts.ready)
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflows at ${width}/${theme}`)
     const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
     if(axe.violations.length) issues.push({route,width,theme,violations:axe.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>({target:n.target,detail:n.failureSummary}))}))})
     const name=route==='/?welcome=1'?'home':route.slice(1)
     await page.screenshot({path:path.join(out,`${name}-${width}-${theme}.png`),fullPage:true})
     if(route === '/map') {
       await page.getByRole('radio',{name:'List',exact:true}).click();await page.getByRole('table').waitFor()
       assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`List overflows at ${width}/${theme}`)
       const listAudit=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
       if(listAudit.violations.length) issues.push({route:'/map?view=list',width,theme,violations:listAudit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)}))})
       await page.screenshot({path:path.join(out,`list-${width}-${theme}.png`),fullPage:true})
     }
     console.log(`PASS ${route} ${width}px ${theme}`)
   }
   assert.deepEqual(errors,[]);await context.close()
 }))
 await browser.close();assert.deepEqual(issues,[]);console.log('PASS: page layouts, light/dark, accessibility and no browser errors.')
})().catch(e=>{console.error(e);process.exit(1)})
