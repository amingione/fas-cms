import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
// Minimal className combiner (avoids path alias issues)
function cn(
  ...inputs: Array<string | number | null | undefined | false | Record<string, boolean>>
) {
  const out: string[] = [];
  for (const i of inputs) {
    if (!i) continue;
    if (typeof i === 'string' || typeof i === 'number') {
      out.push(String(i));
      continue;
    }
    if (typeof i === 'object') {
      for (const [k, v] of Object.entries(i)) if (v) out.push(k);
    }
  }
  return out.join(' ');
}

const badgeVariants = cva(
  'inline-flex items-center rounded-fx-md border px-2.5 py-0.5 text-fx-label-sm font-medium transition-colors focus:outline-none',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground border-transparent',
        secondary: 'bg-secondary text-secondary-foreground border-transparent',
        outline: 'text-foreground border-border'
      }
    },
    defaultVariants: {
      variant: 'default'
    }
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
