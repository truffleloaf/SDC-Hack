import Link from 'next/link'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const pButton = cva(
  'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-[background-color,box-shadow,transform,color,border-color] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground hover:bg-primary/90',
        secondary: 'border border-border-strong bg-card text-foreground hover:border-teal/60 hover:bg-mint',
        ghost: 'text-muted-foreground hover:bg-subtle hover:text-foreground',
        link: 'h-auto rounded-md px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-13 px-7 text-base',
        icon: 'size-11',
        'icon-sm': 'size-9',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

type Variants = VariantProps<typeof pButton>

interface Common extends Variants {
  className?: string
  children?: ReactNode
  loading?: boolean
}

export function PButton({
  variant,
  size,
  className,
  loading,
  children,
  disabled,
  ...props
}: Common & ComponentProps<'button'>) {
  return (
    <button
      className={cn(pButton({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function PLink({
  variant,
  size,
  className,
  children,
  href,
  ...props
}: Common & Omit<ComponentProps<typeof Link>, 'className' | 'children'>) {
  return (
    <Link href={href} className={cn(pButton({ variant, size }), className)} {...props}>
      {children}
    </Link>
  )
}
