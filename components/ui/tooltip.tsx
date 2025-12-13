"use client";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";
import * as TT from "@radix-ui/react-tooltip";

function TooltipProvider({
  delayDuration = 0,
  ...props
}: ComponentProps<typeof TT.Provider>) {
  return (
    <TT.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: ComponentProps<typeof TT.Root>) {
  return (
    <TooltipProvider>
      <TT.Root data-slot="tooltip" {...props} />
    </TooltipProvider>
  );
}

function TooltipTrigger({ ...props }: ComponentProps<typeof TT.Trigger>) {
  return <TT.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  children,
  className,
  sideOffset = 0,
  ...props
}: ComponentProps<typeof TT.Content>) {
  return (
    <TT.Portal>
      <TT.Content
        sideOffset={sideOffset}
        data-slot="tooltip-content"
        className={cn(
          `bg-foreground text-background animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit origin-(--radix-tooltip-content-transform-origin) rounded-md px-3 py-1.5 text-xs text-balance`,
          className
        )}
        {...props}
      >
        {children}
        <TT.Arrow className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
      </TT.Content>
    </TT.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
