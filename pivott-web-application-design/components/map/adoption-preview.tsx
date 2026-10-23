import { ValueSlider } from '@/components/pivott/value-slider'
export function AdoptionPreview({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return <div className="w-full max-w-sm"><div className="flex justify-between gap-4 text-sm"><span>AI adoption <span className="text-muted-foreground">· Preview</span></span><span className="font-mono">{value.toFixed(2)}×</span></div><ValueSlider label="AI adoption preview" value={value} min={1} max={1.5} step={0.01} format={(value) => `${value.toFixed(2)}×`} onChange={onChange} /></div>
}
