import { expect, it } from 'vitest'
import { snapPreview } from './preview'
it('snaps near presets and clamps the preview domain', () => {
  expect(snapPreview(1.02)).toBe(1); expect(snapPreview(1.23)).toBe(1.25); expect(snapPreview(1.27)).toBe(1.25)
  expect(snapPreview(1.4)).toBe(1.4); expect(snapPreview(8)).toBe(1.5); expect(snapPreview(-1)).toBe(.75)
})
