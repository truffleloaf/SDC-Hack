import { describe,expect,it } from 'vitest'
import { signals } from './data/seed'
import live from './data/live-seed.json'
function verifiedSourceErrors(rows: {id:string;evidence:string;sourceUrl?:string;date?:string}[]) {
  return rows.filter(s => s.evidence==='verified' && (!s.sourceUrl?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(s.date ?? '') || !Number.isFinite(Date.parse(s.date!)))).map(s=>s.id)
}
describe('source integrity',()=>{
  it('requires a dated source for every published signal',()=>{expect(verifiedSourceErrors([...signals,...live.signals])).toEqual([])})
  it('rejects missing source or date',()=>{expect(verifiedSourceErrors([{id:'no-url',evidence:'verified',date:'2026-10-24'},{id:'no-date',evidence:'verified',sourceUrl:'https://example.org'}])).toEqual(['no-url','no-date'])})
  it('never gives an assumption a publication attribution',()=>{for(const s of signals.filter(s=>s.evidence==='assumption')){expect(s.sourceName).toBeUndefined();expect(s.sourceUrl).toBeUndefined();expect(s.date).toBeUndefined()}})
})
