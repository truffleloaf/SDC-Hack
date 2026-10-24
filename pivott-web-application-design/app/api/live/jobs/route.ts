import bundled from '@/lib/data/jobs.live.json'
import meta from '@/lib/data/live-meta.json'
import aliases from '@/lib/data/job-aliases.json'
import {supplementAliases} from '@/lib/data/catalog-supplement'
import {filterJobs,parsePublicJobs,type PublicJob} from '@/lib/jobs'
export async function GET(request:Request){
 const q=new URL(request.url).searchParams
 let jobs=bundled as PublicJob[],asOf=meta.dataAsOf
 if(q.get('refresh')==='1'){
  try{
   const payloads=await Promise.all(Array.from({length:10},(_,index)=>index+1).map(async page=>{const response=await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`,{cache:'no-store',signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Public feed unavailable');return response.json()}))
   jobs=parsePublicJobs(payloads,{...aliases,...supplementAliases});asOf=new Date().toISOString().slice(0,10)
  }catch{return Response.json({error:'The public board could not be reached. The dated snapshot is still available.'},{status:503})}
 }
 const postings=filterJobs(jobs,{query:q.get('q')??'',role:q.get('roleId')??'',location:q.get('location')??'',remote:q.get('remote')==='true',sort:'newest'})
 return Response.json({dataset:'live',asOf,count:postings.length,postings},{headers:{'Cache-Control':'no-store'}})
}
