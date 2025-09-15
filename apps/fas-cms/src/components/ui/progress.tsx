'use client';

import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';
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

function Progress({
  className,
  value,
  ...props
}: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot="progress"
      className={cn('bg-primary/20 relative h-2 w-full overflow-hidden rounded-full', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot="progress-indicator"
        className="bg-primary h-full w-full flex-1 transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
