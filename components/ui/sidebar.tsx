"use client";
import {
  Sheet,
  SheetTitle,
  SheetHeader,
  SheetContent,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  useMemo,
  useState,
  useEffect,
  useContext,
  useCallback,
  createContext,
  type CSSProperties,
  type ComponentProps,
} from "react";
import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeftIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { type VariantProps, cva } from "class-variance-authority";

const SIDEBAR_WIDTH = `18rem`;
const SIDEBAR_WIDTH_ICON = `3rem`;
const SIDEBAR_WIDTH_MOBILE = `18rem`;
const SIDEBAR_KEYBOARD_SHORTCUT = `b`;
const SIDEBAR_COOKIE_NAME = `sidebar_state`;
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type SidebarContextProps = {
  open: boolean;
  isMobile: boolean;
  openMobile: boolean;
  toggleSidebar: () => void;
  state: `expanded` | `collapsed`;
  setOpen: (open: boolean) => void;
  setOpenMobile: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarContextProps | null>(null);

function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) throw new Error(`useSidebar must be inside SidebarProvider.`);
  return context;
}

function SidebarProvider({
  style,
  children,
  className,
  open: openProp,
  defaultOpen = true,
  onOpenChange: setOpenProp,
  ...props
}: ComponentProps<`div`> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = useState(false);

  // This is the internal state of the sidebar.
  // We use openProp and setOpenProp for control from outside the component.
  const [_open, _setOpen] = useState(defaultOpen);
  const open = openProp ?? _open;
  const setOpen = useCallback(
    (value: boolean | ((value: boolean) => boolean)) => {
      const openState = typeof value === `function` ? value(open) : value;
      if (setOpenProp) setOpenProp(openState);
      else _setOpen(openState);

      // This sets the cookie to keep the sidebar state.
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
    },
    [setOpenProp, open]
  );

  // Helper to toggle the sidebar.
  const toggleSidebar = useCallback(() => {
    return isMobile ? setOpenMobile((open) => !open) : setOpen((open) => !open);
  }, [isMobile, setOpen, setOpenMobile]);

  // Adds a keyboard shortcut to toggle the sidebar.
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener(`keydown`, handleKeyDown);
    return () => window.removeEventListener(`keydown`, handleKeyDown);
  }, [toggleSidebar]);

  // We add a state so that we can do data-state="expanded" or "collapsed".
  // This makes it easier to style the sidebar with Tailwind classes.
  const state = open ? `expanded` : `collapsed`;

  const contextValue = useMemo<SidebarContextProps>(
    () => ({
      open,
      state,
      setOpen,
      isMobile,
      openMobile,
      toggleSidebar,
      setOpenMobile,
    }),
    [state, open, setOpen, isMobile, openMobile, setOpenMobile, toggleSidebar]
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <TooltipProvider delayDuration={0}>
        <div
          data-slot="sidebar-wrapper"
          style={
            {
              "--sidebar-width": SIDEBAR_WIDTH,
              "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
              ...style,
            } as CSSProperties
          }
          className={cn(
            `group/sidebar-wrapper has-data-[variant=inset]:bg-sidebar flex min-h-svh w-full`,
            className
          )}
          {...props}
        >
          {children}
        </div>
      </TooltipProvider>
    </SidebarContext.Provider>
  );
}

function Sidebar({
  children,
  className,
  side = `left`,
  variant = `sidebar`,
  collapsible = `offcanvas`,
  ...props
}: ComponentProps<`div`> & {
  side?: `left` | `right`;
  variant?: `sidebar` | `floating` | `inset`;
  collapsible?: `offcanvas` | `icon` | `none`;
}) {
  const { isMobile, state, openMobile, setOpenMobile } = useSidebar();

  if (collapsible === `none`) {
    return (
      <div
        data-slot="sidebar"
        className={cn(
          `bg-sidebar text-sidebar-foreground flex h-full w-(--sidebar-width) flex-col`,
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile} {...props}>
        <SheetContent
          side={side}
          data-mobile="true"
          data-slot="sidebar"
          data-sidebar="sidebar"
          style={{ "--sidebar-width": SIDEBAR_WIDTH_MOBILE } as CSSProperties}
          className="bg-sidebar text-sidebar-foreground w-(--sidebar-width) p-0 [&>button]:hidden"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Sidebar</SheetTitle>
            <SheetDescription>Displays the mobile sidebar.</SheetDescription>
          </SheetHeader>
          <div className="flex size-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-side={side}
      data-state={state}
      data-slot="sidebar"
      data-variant={variant}
      data-collapsible={state === `collapsed` ? collapsible : ``}
      className="group peer text-sidebar-foreground hidden md:block"
    >
      {/* This is what handles the sidebar gap on desktop */}
      <div
        data-slot="sidebar-gap"
        className={cn(
          `relative w-(--sidebar-width) bg-transparent transition-[width] duration-200 ease-linear`,
          `group-data-[collapsible=offcanvas]:w-0`,
          `group-data-[side=right]:rotate-180`,
          variant === `floating` || variant === `inset`
            ? `group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4)))]`
            : `group-data-[collapsible=icon]:w-(--sidebar-width-icon)`
        )}
      />
      <div
        data-slot="sidebar-container"
        className={cn(
          `fixed inset-y-0 z-10 hidden h-svh w-(--sidebar-width) transition-[left,right,width] duration-200 ease-linear md:flex`,
          side === `left`
            ? `left-0 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*-1)]`
            : `right-0 group-data-[collapsible=offcanvas]:right-[calc(var(--sidebar-width)*-1)]`,
          // Adjust the padding for floating and inset variants.
          variant === `floating` || variant === `inset`
            ? `p-2 group-data-[collapsible=icon]:w-[calc(var(--sidebar-width-icon)+(--spacing(4))+2px)]`
            : `group-data-[collapsible=icon]:w-(--sidebar-width-icon) group-data-[side=left]:border-r group-data-[side=right]:border-l`,
          className
        )}
        {...props}
      >
        <div
          data-sidebar="sidebar"
          data-slot="sidebar-inner"
          className="bg-sidebar group-data-[variant=floating]:border-sidebar-border flex h-full w-full flex-col group-data-[variant=floating]:rounded-lg group-data-[variant=floating]:border group-data-[variant=floating]:shadow-sm"
        >
          {children}
        </div>
      </div>
    </div>
  );
}

function SidebarTrigger({
  onClick,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar();

  return (
    <Button
      size="icon"
      variant="ghost"
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      className={cn(`size-7`, className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeftIcon />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

function SidebarRail({ className, ...props }: ComponentProps<`button`>) {
  const { toggleSidebar } = useSidebar();

  return (
    <button
      tabIndex={-1}
      data-sidebar="rail"
      title="Toggle Sidebar"
      onClick={toggleSidebar}
      data-slot="sidebar-rail"
      aria-label="Toggle Sidebar"
      className={cn(
        `hover:after:bg-sidebar-border absolute inset-y-0 z-20 hidden w-4 -translate-x-1/2 transition-all ease-linear group-data-[side=left]:-right-4 group-data-[side=right]:left-0 after:absolute after:inset-y-0 after:left-1/2 after:w-[2px] sm:flex`,
        `hover:group-data-[collapsible=offcanvas]:bg-sidebar group-data-[collapsible=offcanvas]:translate-x-0 group-data-[collapsible=offcanvas]:after:left-full`,
        `[[data-side=left][data-state=collapsed]_&]:cursor-e-resize [[data-side=right][data-state=collapsed]_&]:cursor-w-resize`,
        `in-data-[side=left]:cursor-w-resize in-data-[side=right]:cursor-e-resize`,
        `[[data-side=left][data-collapsible=offcanvas]_&]:-right-2`,
        `[[data-side=right][data-collapsible=offcanvas]_&]:-left-2`,
        className
      )}
      {...props}
    />
  );
}

function SidebarInset({ className, ...props }: ComponentProps<`main`>) {
  return (
    <main
      data-slot="sidebar-inset"
      className={cn(
        `bg-background relative flex w-full flex-1 flex-col`,
        `md:peer-data-[variant=inset]:m-2 md:peer-data-[variant=inset]:ml-0 md:peer-data-[variant=inset]:rounded-xl md:peer-data-[variant=inset]:shadow-sm md:peer-data-[variant=inset]:peer-data-[state=collapsed]:ml-2`,
        className
      )}
      {...props}
    />
  );
}

function SidebarHeader({ className, ...props }: ComponentProps<`div`>) {
  return (
    <div
      data-sidebar="header"
      data-slot="sidebar-header"
      className={cn(`flex flex-col p-4 space-y-1`, className)}
      {...props}
    />
  );
}

function SidebarFooter({ className, ...props }: ComponentProps<`div`>) {
  return (
    <div
      data-sidebar="footer"
      data-slot="sidebar-footer"
      className={cn(`flex flex-col gap-2 p-2`, className)}
      {...props}
    />
  );
}

function SidebarContent({ className, ...props }: ComponentProps<`div`>) {
  return (
    <div
      data-sidebar="content"
      data-slot="sidebar-content"
      className={cn(
        `flex min-h-0 grow flex-col border-y group-data-[collapsible=icon]:overflow-hidden`,
        className
      )}
      {...props}
    />
  );
}

function SidebarGroup({ className, ...props }: ComponentProps<`div`>) {
  return (
    <div
      data-sidebar="group"
      data-slot="sidebar-group"
      className={cn(`relative flex w-full min-w-0 flex-col p-2`, className)}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  asChild = false,
  ...props
}: ComponentProps<`div`> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : `div`;

  return (
    <Comp
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      className={cn(
        `text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium outline-hidden transition-[margin,opacity] duration-200 ease-linear focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0`,
        `group-data-[collapsible=icon]:-mt-8 group-data-[collapsible=icon]:opacity-0`,
        className
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({ className, ...props }: ComponentProps<`div`>) {
  return (
    <div
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      className={cn(`w-full text-sm`, className)}
      {...props}
    />
  );
}

function SidebarMenu({ className, ...props }: ComponentProps<`ul`>) {
  return (
    <ul
      data-sidebar="menu"
      data-slot="sidebar-menu"
      className={cn(`flex w-full min-w-0 flex-col gap-1`, className)}
      {...props}
    />
  );
}

function SidebarMenuItem({ className, ...props }: ComponentProps<`li`>) {
  return (
    <li
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      className={cn(`group/menu-item relative`, className)}
      {...props}
    />
  );
}

const sidebarMenuButtonVariants = cva(
  `peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-data-[sidebar=menu-action]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:p-2! [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0`,
  {
    variants: {
      variant: {
        default: `hover:bg-sidebar-accent hover:text-sidebar-accent-foreground`,
        outline: `bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]`,
      },
      size: {
        sm: `h-7 text-xs`,
        default: `h-8 text-sm`,
        lg: `h-12 text-sm group-data-[collapsible=icon]:p-0!`,
      },
    },
    defaultVariants: { size: `default`, variant: `default` },
  }
);

function SidebarMenuButton({
  tooltip,
  className,
  asChild = false,
  size = `default`,
  isActive = false,
  variant = `default`,
  ...props
}: ComponentProps<`button`> &
  VariantProps<typeof sidebarMenuButtonVariants> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | ComponentProps<typeof TooltipContent>;
  }) {
  const Comp = asChild ? Slot : `button`;
  const { isMobile, state } = useSidebar();

  const button = (
    <Comp
      data-size={size}
      data-active={isActive}
      data-sidebar="menu-button"
      data-slot="sidebar-menu-button"
      className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
      {...props}
    />
  );

  if (!tooltip) return button;
  if (typeof tooltip === `string`) tooltip = { children: tooltip };

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent
        side="right"
        align="center"
        hidden={state !== `collapsed` || isMobile}
        {...tooltip}
      />
    </Tooltip>
  );
}

export {
  Sidebar,
  SidebarRail,
  SidebarMenu,
  SidebarInset,
  SidebarGroup,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  SidebarContent,
  SidebarProvider,
  SidebarMenuItem,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarGroupContent,
};
