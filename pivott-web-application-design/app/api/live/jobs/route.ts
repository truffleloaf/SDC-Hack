import jobs from '@/lib/data/jobs.live.json'
import meta from '@/lib/data/live-meta.json'
import {filterJobs,type PublicJob} from '@/lib/jobs'
export function GET(request:Request){const q=new URL(request.url).searchParams;const postings=filterJobs(jobs as PublicJob[],{query:q.get('q')??'',role:q.get('roleId')??'',location:q.get('location')??'',remote:q.get('remote')==='true',sort:'newest'});return Response.json({dataset:'live',asOf:meta.dataAsOf,count:postings.length,postings})}
