import { clamp } from './engine'
/** Snap near the verified presets, otherwise retain a two-decimal preview. */
export function snapPreview(value: number) {
  const next = Math.round(clamp(value, .75, 1.5) * 100) / 100
  return [.75, 1, 1.25].find((preset) => Math.abs(next - preset) <= 0.0200001) ?? next
}
