export interface PublicJob {id:string;roleId:string;title:string;company:string;location:string;url:string;postedAt:string;remote:boolean;tags:string[]}
export function filterJobs(jobs:PublicJob[],filters:{query:string;role:string;location:string;remote:boolean;sort:'newest'|'company'}) {
 const query=filters.query.trim().toLowerCase(),location=filters.location.trim().toLowerCase()
 return jobs.filter(j=>(!filters.role||j.roleId===filters.role)&&(!filters.remote||j.remote)&&(!location||j.location.toLowerCase().includes(location))&&(!query||[j.title,j.company,...j.tags].join(' ').toLowerCase().includes(query))).sort((a,b)=>filters.sort==='company'?a.company.localeCompare(b.company)||a.title.localeCompare(b.title):b.postedAt.localeCompare(a.postedAt)||a.title.localeCompare(b.title))
}
