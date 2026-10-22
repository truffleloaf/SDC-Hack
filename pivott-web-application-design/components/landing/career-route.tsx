/** A diagram of the existing demo journey, rather than a decorative stock illustration. */
export function CareerRoute() {
  return (
    <svg viewBox="0 0 620 240" role="img" aria-labelledby="career-route-title career-route-desc" className="w-full">
      <title id="career-route-title">A route built on your existing skills</title>
      <desc id="career-route-desc">The Finance Admin example connects Excel, ERP and controls skills to a possible Finance Systems Analyst pathway.</desc>
      <g fill="none" stroke="var(--border-strong)" strokeWidth="1">
        <path d="M30 50H590 M30 190H590" strokeDasharray="2 7" />
        <path d="M60 24V216 M560 24V216" strokeDasharray="2 7" />
      </g>
      <path d="M60 120H148C198 120 184 62 232 62H324C374 62 356 120 408 120H560" fill="none" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
      <path d="M148 120C198 120 184 180 232 180H324C374 180 356 120 408 120" fill="none" stroke="var(--teal)" strokeWidth="2" strokeDasharray="5 6" />
      <circle cx="60" cy="120" r="14" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      <circle cx="60" cy="120" r="5" fill="var(--primary)" />
      <circle cx="560" cy="120" r="20" fill="var(--mint)" stroke="var(--primary)" strokeWidth="2" />
      <path d="M552 120H568 M562 114L568 120L562 126" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {[
        { x: 235, y: 62, label: 'ERP' },
        { x: 320, y: 62, label: 'Controls' },
        { x: 278, y: 180, label: 'Excel' },
      ].map(({ x, y, label }) => (
        <g key={label}>
          <rect x={x - 39} y={y - 16} width="78" height="32" rx="16" fill="var(--card)" stroke="var(--border-strong)" />
          <text x={x} y={y + 4} textAnchor="middle" fontSize="12" className="fill-foreground font-sans">{label}</text>
        </g>
      ))}
      <g className="fill-foreground font-sans" fontSize="12" fontWeight="500">
        <text x="60" y="159" textAnchor="middle">Finance Admin</text>
        <text x="560" y="164" textAnchor="middle">Finance Systems</text>
        <text x="560" y="181" textAnchor="middle">Analyst</text>
      </g>
      <text x="278" y="122" textAnchor="middle" fontSize="12" className="fill-muted-foreground font-sans">Build on what you know</text>
    </svg>
  )
}
