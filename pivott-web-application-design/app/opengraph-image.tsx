import { ImageResponse } from 'next/og'
export const alt = 'Pivott: see which parts of your job AI could take on'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
export default function Image() {
  return new ImageResponse(<div style={{ display: 'flex', width: '100%', height: '100%', background: '#f8faf9', color: '#1f2937', padding: 70, alignItems: 'center' }}>
    <div style={{ display: 'flex', flexDirection: 'column', width: 670 }}><div style={{ fontSize: 30, color: '#0f766e', marginBottom: 36 }}>Pivott</div><div style={{ fontSize: 58, lineHeight: 1.1 }}>See which parts of your job AI could take on.</div><div style={{ fontSize: 25, marginTop: 32, color: '#566775' }}>Map your tasks. Compare roles. Make a study plan.</div></div>
    <svg width="350" height="360" viewBox="0 0 350 360"><path d="M170 180L70 70 M170 180L290 130 M170 180L110 300" stroke="#cbd8d5" strokeWidth="3"/><circle cx="70" cy="70" r="50" fill="#fdba74"/><circle cx="290" cy="130" r="44" fill="#fde68a"/><circle cx="110" cy="300" r="40" fill="#5eead4"/><circle cx="170" cy="180" r="20" fill="#0f766e"/></svg>
  </div>, size)
}
