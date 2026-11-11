'use client';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { Root, Indicator } from '@radix-ui/react-progress';

function Progress({
  className,
  indicatorClassName,
  children,
  value,
  ...props
}: ComponentProps<typeof Root> & { indicatorClassName?: string }) {
  return (
    <Root
      data-slot="progress"
      value={value}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-primary/20', className)}
      {...props}
    >
      {children}
      <Indicator
        data-slot="progress-indicator"
        className={cn('h-full w-full flex-1 bg-primary transition-all', indicatorClassName)}
        style={{ width: `${value || 0}%` }}
      />
    </Root>
  );
}

export { Progress };
