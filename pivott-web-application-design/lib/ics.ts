import type { PathwayStep } from './engine'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`
const stamp = (d: Date) => `${ymd(d)}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`

function escape(text: string) {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;')
}

function fold(line: string) {
  const out: string[] = []
  let rest = line
  while (rest.length > 74) {
    out.push(rest.slice(0, 74))
    rest = ' ' + rest.slice(74)
  }
  out.push(rest)
  return out.join('\r\n')
}

export function nextMonday(from = new Date()) {
  const d = new Date(Date.UTC(from.getFullYear(), from.getMonth(), from.getDate()))
  const day = d.getUTCDay()
  d.setUTCDate(d.getUTCDate() + ((8 - day) % 7 || 7))
  return d
}

export function buildIcs(steps: PathwayStep[], roleTitle: string, start = nextMonday()) {
  const now = new Date()
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Pivott//Learning Pathway//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH']
  for (const s of steps) {
    const begin = new Date(start)
    begin.setUTCDate(begin.getUTCDate() + (s.startWeek - 1) * 7)
    const end = new Date(start)
    end.setUTCDate(end.getUTCDate() + s.endWeek * 7)
    const description = [
      `Route: ${roleTitle}`,
      `Study time: ~${s.hours} hours`,
      s.resource ? `Resource: ${s.resource.title} (${s.resource.provider}) ${s.resource.url}` : '',
      `Deliverable: ${s.deliverable}`,
    ]
      .filter(Boolean)
      .join('\n')
    lines.push(
      'BEGIN:VEVENT',
      `UID:${s.id.replace(/[^a-z0-9]/gi, '-')}@pivott.app`,
      `DTSTAMP:${stamp(now)}`,
      `DTSTART;VALUE=DATE:${ymd(begin)}`,
      `DTEND;VALUE=DATE:${ymd(end)}`,
      fold(`SUMMARY:${escape(`Pivott · ${s.title}`)}`),
      fold(`DESCRIPTION:${escape(description)}`),
      ...(s.resource ? [fold(`URL:${s.resource.url}`)] : []),
      'END:VEVENT',
    )
  }
  lines.push('END:VCALENDAR')
  return lines.join('\r\n')
}

export function downloadFile(content: BlobPart, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
