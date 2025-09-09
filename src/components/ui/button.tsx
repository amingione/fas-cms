import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from './utils';

// Base uses .btn-glass from global.css for pill radius + glass effect.
// Removed Tailwind ring utilities so we don't override the subtle CSS outline.
const buttonVariants = cva(
  'btn-glass inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*="size-"])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none',
  {
    variants: {
      variant: {
        // Maps to .btn-glass.btn-primary in global.css
        default: 'btn-primary',
        secondary: 'btn-secondary',
        dark: 'btn-dark',
        // low-chrome options (use explicit classes to avoid CSS precedence issues)
        outline: 'btn-outline',
        ghost: 'btn-ghost',
        link: 'bg-transparent border-none shadow-none underline underline-offset-4 hover:opacity-90'
      },
      size: {
        xs: 'btn-xs',
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg',
        // icon buttons keep perfect circle; adjust via utility size and rounded-full
        icon: 'rounded-full size-9 p-0 [&_svg]:size-4'
      }
    },
    compoundVariants: [
      // Ensure ghost/outline still inherit glass base subtly
      { variant: 'ghost', class: 'btn-glass' },
      { variant: 'outline', class: 'btn-glass' },
      { variant: 'link', class: '' }
    ],
    defaultVariants: {
      variant: 'default',
      size: 'md'
    }
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
