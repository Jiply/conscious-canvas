'use client';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { Root } from '@radix-ui/react-separator';

function Separator({ className, decorative = true, orientation = `horizontal`, ...props }: ComponentProps<typeof Root>) {
  return (
    <Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        `bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px`,
        className
      )}
      {...props}
    />
  );
}

export { Separator };
