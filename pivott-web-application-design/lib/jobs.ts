export interface PublicJob {id:string;roleId:string;title:string;company:string;location:string;url:string;postedAt:string;remote:boolean;tags:string[]}
export function filterJobs(jobs:PublicJob[],filters:{query:string;role:string;location:string;remote:boolean;sort:'newest'|'company'}) {
 const query=filters.query.trim().toLowerCase(),location=filters.location.trim().toLowerCase()
 return jobs.filter(j=>(!filters.role||j.roleId===filters.role)&&(!filters.remote||j.remote)&&(!location||j.location.toLowerCase().includes(location))&&(!query||[j.title,j.company,...j.tags].join(' ').toLowerCase().includes(query))).sort((a,b)=>filters.sort==='company'?a.company.localeCompare(b.company)||a.title.localeCompare(b.title):b.postedAt.localeCompare(a.postedAt)||a.title.localeCompare(b.title))
}

/** Longest configured title/alias match, mirroring the public importer. No inferred vacancies. */
export function parsePublicJobs(payloads:unknown[],aliases:Record<string,string[]>):PublicJob[] {
 const normalize=(s:string)=>' '+s.toLowerCase().replace(/[^a-z0-9à-ÿ]+/g,' ').trim()+' '
 const index=Object.entries(aliases).flatMap(([role,terms])=>terms.map(term=>({role,term:normalize(term)}))).sort((a,b)=>b.term.length-a.term.length || a.term.localeCompare(b.term))
 const seen=new Set<string>(),result:PublicJob[]=[]
 for(const payload of payloads){
  if(!payload || typeof payload!=='object' || !Array.isArray((payload as {data?:unknown}).data))throw new Error('Invalid public feed response')
  for(const raw of (payload as {data:unknown[]}).data){
   if(!raw || typeof raw!=='object')continue
   const p=raw as Record<string,unknown>
   if(typeof p.slug!=='string'||seen.has(p.slug)||typeof p.title!=='string'||typeof p.url!=='string')continue
   let url:URL;try{url=new URL(p.url)}catch{continue}
   if(!['http:','https:'].includes(url.protocol)||url.username||url.password)continue
   if(typeof p.created_at!=='string' && typeof p.created_at!=='number')continue
   const date=new Date(typeof p.created_at==='number'?p.created_at*1000:p.created_at)
   if(!Number.isFinite(date.getTime())||date.getTime()>Date.now()+86400000)continue
   const tags=Array.isArray(p.tags)?p.tags.filter((t):t is string=>typeof t==='string'):[]
   const role=index.find(row=>normalize(p.title+' '+tags.join(' ')).includes(row.term))?.role
   if(!role)continue
   seen.add(p.slug);result.push({id:p.slug,roleId:role,title:p.title,company:typeof p.company_name==='string'?p.company_name:'',location:typeof p.location==='string'?p.location:'',url:url.href,postedAt:date.toISOString().slice(0,10),remote:p.remote===true,tags})
  }
 }
 return result
}
