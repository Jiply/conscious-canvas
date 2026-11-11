'use client';
import { cn } from '@/lib/utils';
import { XIcon } from 'lucide-react';
import type { ComponentProps } from 'react';
import { Root, Close, Title, Portal, Content, Overlay, Description } from '@radix-ui/react-dialog';
const Sheet = ({ ...props }: ComponentProps<typeof Root>) => <Root data-slot="sheet" {...props} />;
const SheetPortal = ({ ...props }: ComponentProps<typeof Portal>) => <Portal data-slot="sheet-portal" {...props} />;

function SheetOverlay({ className, ...props }: ComponentProps<typeof Overlay>) {
  return (
    <Overlay
      data-slot="sheet-overlay"
      className={cn(
        `fixed inset-0 z-50 bg-black/50 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0`,
        className
      )}
      {...props}
    />
  );
}

function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: ComponentProps<typeof Content> & { side?: 'top' | 'right' | 'bottom' | 'left' }) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <Content
        data-slot="sheet-content"
        className={cn(
          `fixed z-50 flex flex-col gap-4 bg-background shadow-lg transition ease-in-out outline-none data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:animate-in data-[state=open]:duration-500`,
          side === 'right' &&
            `inset-y-0 right-0 h-full w-3/4 data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm`,
          side === 'left' &&
            `inset-y-0 left-0 h-full w-3/4 data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm`,
          side === 'bottom' &&
            'inset-x-0 bottom-0 h-auto data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom',
          side === 'top' && 'inset-x-0 top-0 h-auto data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top',
          className
        )}
        {...props}
      >
        {children}
        <Close className="absolute top-4 right-4 rounded-xs opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none data-[state=open]:bg-secondary">
          <XIcon className="size-4" />
          <span className="sr-only">Close</span>
        </Close>
      </Content>
    </SheetPortal>
  );
}

function SheetHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sheet-header" className={cn('flex flex-col gap-1.5 p-4', className)} {...props} />;
}

function SheetTitle({ className, ...props }: ComponentProps<typeof Title>) {
  return <Title data-slot="sheet-title" className={cn('font-semibold text-foreground', className)} {...props} />;
}

function SheetDescription({ className, ...props }: ComponentProps<typeof Description>) {
  return <Description data-slot="sheet-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export { Sheet, SheetTitle, SheetHeader, SheetContent, SheetDescription };
