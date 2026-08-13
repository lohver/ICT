"use client";

import { cn } from "@/lib/utils";
import { NavigationMenu as BaseNav } from "@base-ui-components/react/navigation-menu";
import { ChevronDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export const NavigationMenu = BaseNav.Root;

export function NavigationMenuList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseNav.List>) {
  return (
    <BaseNav.List
      className={cn("flex flex-row items-center gap-1 list-none m-0 p-0", className)}
      {...props}
    />
  );
}

export const NavigationMenuItem = BaseNav.Item;
export const NavigationMenuLink = BaseNav.Link;

export function NavigationMenuTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseNav.Trigger>) {
  return (
    <BaseNav.Trigger
      className={cn(
        "group inline-flex h-9 items-center justify-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        "text-fg-muted hover:bg-bg-muted hover:text-fg",
        "focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
        "data-[popup-open]:bg-bg-muted data-[popup-open]:text-fg",
        "aria-disabled:pointer-events-none aria-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDown
        className="h-3.5 w-3.5 opacity-60 transition-transform duration-200 group-data-[popup-open]:rotate-180"
        aria-hidden
      />
    </BaseNav.Trigger>
  );
}

export function NavigationMenuContent({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseNav.Popup>) {
  return (
    <BaseNav.Portal>
      <BaseNav.Positioner sideOffset={8}>
        <BaseNav.Popup
          className={cn(
            "z-50 overflow-hidden rounded-md border border-border bg-surface-elevated shadow-md",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            "transition-all duration-150",
            className,
          )}
          {...props}
        />
      </BaseNav.Positioner>
    </BaseNav.Portal>
  );
}

export function NavigationMenuIndicator({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseNav.Icon>) {
  return (
    <BaseNav.Icon className={cn("flex h-1.5 w-1.5 rounded-full bg-accent", className)} {...props} />
  );
}

export function NavigationMenuViewport({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseNav.Viewport>) {
  return (
    <div className="absolute left-0 top-full flex justify-center">
      <BaseNav.Viewport className={cn("z-50", className)} {...props} />
    </div>
  );
}
