'use client'

import { Slider as SliderPrimitive } from '@base-ui/react/slider'
import { cn } from '@/lib/utils'

export function ValueSlider({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  label,
  format = (v) => `${Math.round(v)}%`,
  disabled,
  className,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  label: string
  format?: (v: number) => string
  disabled?: boolean
  className?: string
}) {
  return (
    <SliderPrimitive.Root
      value={value}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : (v as number))}
      className={cn('w-full', className)}
    >
      <SliderPrimitive.Control className="relative flex h-11 w-full touch-none items-center select-none data-disabled:opacity-40">
        <SliderPrimitive.Track className="relative h-1.5 w-full grow rounded-full bg-border">
          <SliderPrimitive.Indicator className="rounded-full bg-teal" />
          <SliderPrimitive.Thumb
            aria-label={label}
            getAriaValueText={() => format(value)}
            className="group relative block size-5 rounded-full border-2 border-teal bg-card shadow-soft outline-none transition-[box-shadow] duration-150 hover:ring-4 hover:ring-teal/15 focus-visible:ring-4 focus-visible:ring-teal/30"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 rounded-md bg-foreground px-1.5 py-0.5 font-mono text-[11px] text-background opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 group-data-dragging:opacity-100"
            >
              {format(value)}
            </span>
          </SliderPrimitive.Thumb>
        </SliderPrimitive.Track>
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}
