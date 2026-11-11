'use client';
import { cn } from '@/lib/utils';
import type { ComponentProps } from 'react';
import { Root, Arrow, Portal, Content, Trigger, Provider } from '@radix-ui/react-tooltip';

function TooltipProvider({ delayDuration = 0, ...props }: ComponentProps<typeof Provider>) {
  return <Provider data-slot="tooltip-provider" delayDuration={delayDuration} {...props} />;
}

function Tooltip({ ...props }: ComponentProps<typeof Root>) {
  return (
    <TooltipProvider>
      <Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

const TooltipTrigger = ({ ...props }: ComponentProps<typeof Trigger>) => <Trigger data-slot="tooltip-trigger" {...props} />;

function TooltipContent({ children, className, sideOffset = 0, ...props }: ComponentProps<typeof Content>) {
  return (
    <Portal>
      <Content
        sideOffset={sideOffset}
        data-slot="tooltip-content"
        className={cn(
          `z-50 w-fit origin-(--radix-tooltip-content-transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`,
          className
        )}
        {...props}
      >
        {children}
        <Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
      </Content>
    </Portal>
  );
}

export { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider };
