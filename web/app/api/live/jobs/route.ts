import bundled from '@/lib/data/jobs.live.json'
import meta from '@/lib/data/live-meta.json'
import aliases from '@/lib/data/job-aliases.json'
import {supplementAliases} from '@/lib/data/catalog-supplement'
import {filterJobs,parsePublicJobs,type PublicJob} from '@/lib/jobs'
export async function GET(request:Request){
 const q=new URL(request.url).searchParams
 const roleId=q.get('roleId')?.trim()||undefined
 if(roleId && !(roleId in aliases)) return Response.json({error:'Role not found'},{status:404})
 let jobs=bundled as PublicJob[],asOf=meta.dataAsOf
 if(q.get('refresh')==='1'){
  try{
   const payloads=await Promise.all(Array.from({length:10},(_,index)=>index+1).map(async page=>{const response=await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Public feed unavailable');return response.json()}))
   jobs=parsePublicJobs(payloads,{...aliases,...supplementAliases});asOf=new Date().toISOString().slice(0,10)
  }catch{return Response.json({error:'The public board could not be reached. The dated snapshot is still available.'},{status:503})}
 }
 const matched=filterJobs(jobs,{query:q.get('q')??'',role:roleId??'',location:q.get('location')??'',remote:q.get('remote')==='true',sort:'newest'})
 const rawLimit=Number(q.get('limit'))
 const limit=Number.isFinite(rawLimit)&&rawLimit>0?Math.min(100,Math.max(1,Math.trunc(rawLimit))):undefined
 const postings=limit?matched.slice(0,limit):matched
 return Response.json({dataset:'live',asOf,count:matched.length,postings},{headers:{'Cache-Control':'no-store'}})
}
