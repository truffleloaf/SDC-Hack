// Synthetic SDK responses only. Run against a dev server with the documented fixture settings.
const assert = require('node:assert/strict')
const { launchBrowser } = require('./browser-test-helpers.cjs')
const AxeBuilder = require(process.env.AXE_PLAYWRIGHT_MODULE || '@axe-core/playwright').default
const origin = process.env.PIVOTT_TEST_ORIGIN || 'http://localhost:3003'
const remote = 'https://pivott-account-test.supabase.co'
const profile = { version:1,mode:'personal',name:'Test profile',roleId:'finance-admin',jobTitle:'Device profile',taskNames:{},careerGoal:'',savedRouteIds:[],updatedAt:'2026-10-22T08:00:00Z',selections:[{taskId:'fa-invoice',share:100}],customTasks:[],resumeSkillIds:[],skills:{excel:0},scenario:'normal',targetRoleId:null,hoursPerWeek:6,freeOnly:false,completedSteps:[],customSignals:[],appliedSignalIds:[],recentlyChanged:[] }
const user = {id:'11111111-1111-4111-8111-111111111111',email:'fixture@example.invalid',aud:'authenticated',role:'authenticated',app_metadata:{},user_metadata:{},created_at:'2026-10-22T00:00:00Z'}
const exp = Math.floor(Date.now()/1000)+3600
const token = `${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({exp,sub:user.id,aud:'authenticated',role:'authenticated'})).toString('base64url')}.synthetic-signature`
const session = {access_token:token,refresh_token:'synthetic-refresh',expires_at:exp,expires_in:3600,token_type:'bearer',user}
;(async()=>{
 const browser = await launchBrowser()
 await browser.newPage() // Keep an anchor for Chromium builds using a single process.
 async function fixture({device=profile,account=null,signedIn=true}={}) {
   const context = await browser.newContext({viewport:{width:1280,height:900},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']})
   await context.addInitScript(({device,session,signedIn})=>{if(!localStorage.getItem('test_initialized')){localStorage.setItem('test_initialized','1');if(device)localStorage.setItem('pivott:v1',JSON.stringify(device));if(signedIn)localStorage.setItem('sb-pivott-account-test-auth-token',JSON.stringify(session))}},{device,session,signedIn})
   const state={row:account,mutations:0,reads:0,offline:false,deleted:false,requests:[],errors:[]}
   const page=await context.newPage();page.setDefaultTimeout(30000);page.on('pageerror',e=>state.errors.push(e.message))
   await context.route(`${remote}/**`,async route=>{
     const request=route.request(),url=new URL(request.url()),method=request.method();state.requests.push({path:url.pathname,method})
     if(state.offline)return route.abort('internetdisconnected')
     if(url.pathname.endsWith('/user_profiles')){
       if(method==='GET'){state.reads++;return route.fulfill({json:state.row?[state.row]:[]})}
       state.mutations++
       const data=request.postDataJSON()
       if(method==='PATCH'){
         if(url.searchParams.get('revision')!==`eq.${state.row?.revision}`)return route.fulfill({json:[]})
         state.row={...state.row,profile:data.profile,revision:state.row.revision+1,updated_at:new Date().toISOString()}
       }else if(method==='POST'){
         if(state.row)return route.fulfill({status:409,json:{code:'23505',message:'duplicate'}})
         state.row={profile:data.profile,revision:1,updated_at:new Date().toISOString()}
       }
       return route.fulfill({json:state.row?[state.row]:[]})
     }
     if(url.pathname.endsWith('/verify')){
       const data=request.postDataJSON()
       if(data.token==='000000')return route.fulfill({status:400,json:{code:'otp_expired',error_code:'otp_expired',msg:'Token has expired or is invalid'}})
       if(data.token==='111111')return route.fulfill({status:400,json:{code:'otp_expired',error_code:'otp_expired',msg:'Expired token'}})
       return route.fulfill({json:session})
     }
     if(url.pathname.endsWith('/otp')){
       if(request.postDataJSON().email==='rate@example.invalid')return route.fulfill({status:429,json:{code:'over_email_send_rate_limit',msg:'Rate limit'}})
       return route.fulfill({json:{}})
     }
     if(url.pathname.endsWith('/token'))return route.fulfill({json:session})
     if(url.pathname.endsWith('/authorize'))return route.fulfill({contentType:'text/html',body:'<title>Synthetic Google handoff</title>'})
     if(url.pathname.endsWith('/rpc/delete_own_account')){state.deleted=true;state.row=null;return route.fulfill({status:204})}
     if(url.pathname.endsWith('/logout'))return route.fulfill({status:204})
     return route.fulfill({json:{}})
   })
   return {context,page,state,device:()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pivott:v1'))),done:async()=>{assert.deepEqual(state.errors,[]);await context.close()}}
 }
 async function audit(page,selector,label){
   for(const width of [375,1280])for(const theme of ['light','dark']){
     await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme)
     const result=await new AxeBuilder({page}).include(selector).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
     assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${label} ${width}px ${theme}`)
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
   }
 }
 const first=await fixture({signedIn:false});let {page,state}=first
 await page.goto(`${origin}/start`)
 await page.getByRole('button',{name:'Sign in',exact:true}).click()
 const dialog=page.getByRole('dialog')
 for(const width of [375,1280])for(const theme of ['light','dark']){
   await page.setViewportSize({width,height:900});await page.evaluate(theme=>document.documentElement.classList.toggle('dark',theme==='dark'),theme)
   const audit=await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()
   assert.deepEqual(audit.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`${width}px ${theme}`)
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1))
 }
 await page.setViewportSize({width:375,height:900});await page.evaluate(()=>document.documentElement.classList.remove('dark'))
 await dialog.getByLabel('Email address').fill('rate@example.invalid');await dialog.getByRole('button',{name:'Email me a code'}).click()
 await dialog.getByRole('alert').filter({hasText:'Too many attempts'}).waitFor()
 await dialog.getByLabel('Email address').fill(user.email);await page.keyboard.press('Enter')
 await dialog.getByLabel('6-digit code').waitFor();assert(await dialog.getByRole('button',{name:/Resend code in/}).isDisabled())
 await dialog.getByLabel('6-digit code').fill('000000');await dialog.getByRole('alert').filter({hasText:"isn't right or has expired"}).waitFor()
 await dialog.getByLabel('6-digit code').fill('111111');await dialog.getByRole('alert').filter({hasText:'That code expired'}).waitFor()
 const badCodeAudit=await new AxeBuilder({page}).include('[role="dialog"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(badCodeAudit.violations.map(v=>v.id),[])
 await dialog.getByRole('button',{name:'Use a different email'}).click();assert.equal(await dialog.getByLabel('Email address').inputValue(),user.email)
 await dialog.getByLabel('Email address').fill('second@example.invalid');await dialog.getByRole('button',{name:'Email me a code'}).click()
 await page.evaluate(()=>navigator.clipboard.writeText('123 456'))
 await dialog.getByLabel('6-digit code').focus();await page.keyboard.press('Control+V')
 await page.getByRole('button',{name:'Account menu'}).waitFor();assert.equal(new URL(page.url()).pathname,'/start')
 await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'))
 await page.goto(`${origin}/account`);await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor()
 assert.equal(state.row.profile.skills.excel,0);assert.equal(state.mutations,1)
 await audit(page,'main','account controls')
 console.log('PASS email-code errors, paste/keyboard sign-in, automatic first upload, 375/1280 light/dark dialog axe checks')
 // Account deletion requires typing, and preserves device work.
 await page.getByRole('button',{name:'Delete account',exact:true}).click()
 assert(await page.getByRole('dialog').getByRole('button',{name:'Delete account',exact:true}).isDisabled())
 await page.getByLabel('Type delete to confirm').fill('delete');await page.getByRole('dialog').getByRole('button',{name:'Delete account',exact:true}).click()
 await page.getByRole('button',{name:'Sign in to sync',exact:true}).waitFor();assert(state.deleted);assert.equal((await first.device()).skills.excel,0)
 // Google starts through its provider URL; the OAuth callback returns only to an allowed local path.
 await page.getByRole('button',{name:'Sign in to sync',exact:true}).click();await page.getByRole('button',{name:'Continue with Google'}).click()
 await page.waitForURL(url=>url.origin===remote&&url.pathname.endsWith('/authorize'))
 assert.equal(new URL(page.url()).searchParams.get('provider'),'google')
 await page.goto(`${origin}/signin?code=synthetic-google-code&next=/account`);await page.waitForURL(url=>url.pathname==='/account')
 await page.getByRole('button',{name:'Account menu'}).waitFor();await first.done()
 console.log('PASS typed account deletion, Google handoff and OAuth return')
 const cloud={profile:{...profile,jobTitle:'Cloud profile',skills:{excel:3}},revision:1,updated_at:'2026-10-23T09:00:00Z'}
 const load=await fixture({device:null,account:cloud});await load.page.goto(`${origin}/account`);await load.page.getByRole('status').filter({hasText:/^Saved$/}).waitFor()
 assert.equal((await load.device()).skills.excel,3);assert.equal(load.state.mutations,0)
 await load.page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await load.device()).roleId,null)
 await load.done();console.log('PASS empty-device account load and backup undo')
 const compare=await fixture({account:cloud});await compare.page.goto(`${origin}/account`)
 await compare.page.getByRole('heading',{name:'Choose the plan to sync'}).waitFor();assert.equal(compare.state.mutations,0)
 await audit(compare.page,'[role=dialog]','version comparison')
 await compare.page.getByRole('button',{name:'Use this device’s version'}).click()
 await compare.page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();assert.equal(compare.state.row.profile.skills.excel,0)
 await compare.page.getByRole('button',{name:'Undo',exact:true}).click()
 await compare.page.getByRole('status').filter({hasText:'Sync paused'}).waitFor();assert.equal(compare.state.row.profile.skills.excel,3)
 await compare.done();console.log('PASS version choice, revision-checked replacement and account undo')
 const guest=await fixture({signedIn:false});page=guest.page
 await page.goto(`${origin}/account`)
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download my data (JSON)'}).click()
 const file=await download;const exported=JSON.parse(await require('node:fs/promises').readFile(await file.path(),'utf8'))
 assert.equal(exported.profile.skills.excel,0)
 await page.getByLabel('Pivott JSON backup').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')})
 await page.getByRole('alert').filter({hasText:'not a readable Pivott'}).waitFor();assert.equal((await guest.device()).jobTitle,'Device profile')
 exported.profile.jobTitle='Imported backup'
 await page.getByLabel('Pivott JSON backup').setInputFiles({name:'profile.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(exported))})
 await page.getByRole('dialog').getByRole('button',{name:'Import profile',exact:true}).click();assert.equal((await guest.device()).jobTitle,'Imported backup')
 await page.getByRole('button',{name:'Undo',exact:true}).click();assert.equal((await guest.device()).jobTitle,'Device profile')
 await guest.done();console.log('PASS guest JSON download, invalid import recovery, reviewed import and undo')
 const learning=await fixture({signedIn:false,device:{...profile,targetRoleId:'finance-systems-analyst',skills:{excel:3,erp:3}}});page=learning.page
 await page.goto(`${origin}/pathway`)
 await page.getByRole('checkbox',{name:/ERP systems/}).click()
 await page.getByRole('button',{name:'Not yet',exact:true}).click();assert.equal((await learning.device()).skills.erp,3)
 await page.getByRole('checkbox',{name:/ERP systems/}).click();await page.getByRole('checkbox',{name:/ERP systems/}).click()
 await page.getByRole('button',{name:'Yes',exact:true}).click();assert.equal((await learning.device()).skills.erp,4)
 await learning.done();console.log('PASS learning completion never changes a rating until accepted')
 const conflict=await fixture({account:{...cloud,profile}});page=conflict.page;state=conflict.state
 await page.goto(`${origin}/workspace`);await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor()
 state.row={...state.row,revision:2,profile:{...profile,jobTitle:'Second device'}}
 await page.getByLabel('Career goal (optional)').fill('New local goal')
 await page.getByRole('heading',{name:'Choose the plan to sync'}).waitFor()
 assert.equal(state.row.profile.jobTitle,'Second device')
 await page.getByRole('button',{name:'Use account version'}).click();assert.equal((await conflict.device()).jobTitle,'Second device')
 state.offline=true;await page.getByLabel('Career goal (optional)').fill('Offline change')
 await page.getByRole('status').filter({hasText:'Offline, will retry'}).waitFor();assert.equal((await conflict.device()).careerGoal,'Offline change')
 state.offline=false;await page.evaluate(()=>window.dispatchEvent(new Event('online')))
 await page.getByRole('status').filter({hasText:/^Saved$/}).waitFor();assert.equal(state.row.profile.careerGoal,'Offline change')
 await page.getByRole('button',{name:'More options'}).click();await page.getByRole('menuitem',{name:'Delete my data on this device'}).click()
 await page.getByRole('dialog').getByRole('button',{name:'Delete my data on this device'}).click()
 await page.getByRole('button',{name:'Sign in',exact:true}).waitFor()
 assert(await page.evaluate(()=>!Object.keys(localStorage).some(key=>key.startsWith('sb-')||key==='pivott:v1:backup')))
 assert(state.row);await conflict.done();console.log('PASS stale-save comparison, offline retry and local-session deletion')
 await browser.close()
 console.log('PASS account checks use intercepted fixtures only. Live Supabase, SMTP, Google and phone hardware remain owner checks.')
})().catch(error=>{console.error(error);process.exit(1)})
