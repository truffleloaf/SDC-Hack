'use client'
import { useMemo, useState } from 'react'
import { BellRing, Building2, CalendarDays, ExternalLink, MapPin, Monitor } from 'lucide-react'
import { useJobNotifications } from '@/components/jobs/job-notification-center'
import jobs from '@/lib/data/jobs.live.json'
import meta from '@/lib/data/live-meta.json'
import { roles } from '@/lib/data/seed'
import { filterJobs, locationDetails, type PublicJob } from '@/lib/jobs'

type Workplace = 'all' | 'remote' | 'location'
export default function JobsPage() {
  const { openCenter } = useJobNotifications()
  const [filters, setFilters] = useState({ query: '', role: '', location: '', remote: false, workplace: 'all' as Workplace, sort: 'newest' as 'newest'|'company' })
  const [listings, setListings] = useState(jobs as PublicJob[])
  const [asOf, setAsOf] = useState(meta.dataAsOf)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [refreshed, setRefreshed] = useState(false)
  const roleNames = useMemo(() => Object.fromEntries(roles.map(role => [role.id, role.title])), [])
  const locations = useMemo(() => Array.from(new Set(listings.map(job => job.location).filter(Boolean))).sort().slice(0, 100), [listings])
  async function refresh() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/live/jobs?refresh=1', { cache: 'no-store' })
      if (!response.ok) throw new Error('The public board could not be reached. Your dated snapshot is unchanged.')
      const data = await response.json()
      if (!Array.isArray(data.postings)) throw new Error('The feed response could not be read.')
      setListings(data.postings); setAsOf(data.asOf); setRefreshed(true)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The feed could not be refreshed.') }
    finally { setLoading(false) }
  }
  const results = filterJobs(listings, filters)
  const control = 'w-full min-w-0 min-h-11 rounded-lg border border-border bg-card px-3 text-sm'
  return <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8"><div className="max-w-3xl"><p className="text-sm font-medium text-primary">Public listings</p><h1 className="mt-2 text-3xl font-semibold sm:text-4xl">See where the work is located</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Arbeitnow snapshot · {asOf}. The feed mainly covers Germany. Every card shows the source location and work arrangement; confirm the details on the original listing before applying.</p></div><div className="mt-5 flex flex-wrap gap-3"><button className="min-h-11 rounded-lg border border-border bg-card px-4 text-sm font-medium disabled:opacity-60" type="button" disabled={loading} onClick={() => void refresh()}>{loading ? 'Fetching public listings…' : 'Refresh public listings'}</button><button className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" type="button" onClick={() => openCenter('settings')}><BellRing className="size-4" aria-hidden/>Customize job updates</button></div><p className="mt-2 text-xs text-muted-foreground">Fetches ten pages from the public board. No profile, résumé or sign-in details are sent.</p>{error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    <form className="card-surface mt-7 grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3" onSubmit={event => event.preventDefault()}><label className="grid min-w-0 gap-2 text-sm lg:col-span-2">Title, company, place or keyword<input className={control} value={filters.query} maxLength={100} onChange={event => setFilters({ ...filters, query: event.target.value })}/></label><label className="grid min-w-0 gap-2 text-sm">Role family<select className={control} value={filters.role} onChange={event => setFilters({ ...filters, role: event.target.value })}><option value="">All roles</option>{roles.map(role => <option value={role.id} key={role.id}>{role.title}</option>)}</select></label><label className="grid min-w-0 gap-2 text-sm">City, region or country<input className={control} list="job-locations" value={filters.location} maxLength={100} onChange={event => setFilters({ ...filters, location: event.target.value })}/><datalist id="job-locations">{locations.map(location => <option value={location} key={location}/>)}</datalist></label><label className="grid min-w-0 gap-2 text-sm">Work arrangement<select className={control} value={filters.workplace} onChange={event => setFilters({ ...filters, workplace: event.target.value as Workplace })}><option value="all">Remote and location-based</option><option value="remote">Remote only</option><option value="location">Location-based only</option></select></label><label className="grid min-w-0 gap-2 text-sm">Sort<select className={control} value={filters.sort} onChange={event => setFilters({ ...filters, sort: event.target.value as 'newest'|'company' })}><option value="newest">Newest first</option><option value="company">Company name</option></select></label><button className={`${control} sm:col-span-2 lg:col-span-1`} type="button" onClick={() => setFilters({ query: '', role: '', location: '', remote: false, workplace: 'all', sort: 'newest' })}>Reset filters</button></form>
    <p role="status" className="mt-6 text-sm">{results.length} {results.length === 1 ? 'listing matches' : 'listings match'} your filters.</p>
    {!results.length && <div className="mt-4 rounded-lg border border-border p-5 text-sm">{(listings.length || refreshed) ? 'No listings match these filters. Try a broader place, role or keyword.' : 'No posting records are bundled in this snapshot. The refresh adds verified public-feed records only.'}<a className="mt-3 block underline" href="https://www.arbeitnow.com/" target="_blank" rel="noreferrer">Visit the original job board</a></div>}
    <ul className="mt-4 grid gap-4">{results.map(job => { const location = locationDetails(job.location); return <li key={job.id} className="card-surface p-5 sm:p-6"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="text-xs font-medium uppercase tracking-wide text-primary">{roleNames[job.roleId] || 'Matched occupation'}</p><h2 className="mt-1 text-lg font-semibold">{job.title}</h2><p className="mt-2 flex items-center gap-2 text-sm"><Building2 className="size-4 shrink-0" aria-hidden />{job.company || 'Company not supplied'}</p></div><a className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground" href={job.url} target="_blank" rel="noreferrer">View original<ExternalLink className="size-4" aria-hidden /></a></div><dl className="mt-5 grid gap-3 border-t border-border pt-5 text-sm sm:grid-cols-3"><div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-4" aria-hidden />Place</dt><dd className="mt-1 font-medium">{location.place}</dd>{location.region && <dd className="text-xs text-muted-foreground">{location.region}</dd>}</div><div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><Monitor className="size-4" aria-hidden />Work arrangement</dt><dd className="mt-1 font-medium">{job.remote ? 'Remote listed' : 'Location-based'}</dd></div><div><dt className="flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" aria-hidden />Posted</dt><dd className="mt-1 font-medium"><time dateTime={job.postedAt}>{job.postedAt}</time></dd></div></dl>{job.tags.length > 0 && <details className="mt-4 text-sm"><summary className="min-h-11 cursor-pointer py-3 font-medium">Skills and listing tags</summary><p className="text-muted-foreground">{job.tags.join(' · ')}</p></details>}</li> })}</ul>
  </div>
}
