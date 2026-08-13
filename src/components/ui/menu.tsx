"use client";

import { cn } from "@/lib/utils";
import { Menu as BaseMenu } from "@base-ui-components/react/menu";
import { Check, ChevronRight, Circle } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export const Menu = BaseMenu.Root;
export const MenuTrigger = BaseMenu.Trigger;
export const MenuSubmenu = BaseMenu.SubmenuRoot;
export const MenuSubmenuTrigger = BaseMenu.SubmenuTrigger;

const menuPopupBaseClasses = cn(
  "z-50 min-w-[8rem] overflow-hidden rounded-md border border-border p-1 shadow-md",
  "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
  "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
  "transition-all duration-150",
);

function popupClasses(variant: "solid" | "glass") {
  return cn(
    menuPopupBaseClasses,
    variant === "glass" ? "surface-glass-panel" : "bg-surface-elevated",
  );
}

export function MenuContent({
  className,
  sideOffset = 4,
  variant = "solid",
  ...props
}: ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
  sideOffset?: number;
  variant?: "solid" | "glass";
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={sideOffset}>
        <BaseMenu.Popup className={cn(popupClasses(variant), className)} {...props} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

export function MenuSubmenuContent({
  className,
  sideOffset = 4,
  variant = "solid",
  ...props
}: ComponentPropsWithoutRef<typeof BaseMenu.Popup> & {
  sideOffset?: number;
  variant?: "solid" | "glass";
}) {
  return (
    <BaseMenu.Portal>
      <BaseMenu.Positioner sideOffset={sideOffset}>
        <BaseMenu.Popup className={cn(popupClasses(variant), className)} {...props} />
      </BaseMenu.Positioner>
    </BaseMenu.Portal>
  );
}

const menuItemClasses = cn(
  "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "text-fg transition-colors",
  "data-[highlighted]:bg-bg-muted data-[highlighted]:text-fg",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
);

export function MenuItem({ className, ...props }: ComponentPropsWithoutRef<typeof BaseMenu.Item>) {
  return <BaseMenu.Item className={cn(menuItemClasses, className)} {...props} />;
}

export function MenuCheckboxItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseMenu.CheckboxItem>) {
  return (
    <BaseMenu.CheckboxItem className={cn(menuItemClasses, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <BaseMenu.CheckboxItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </BaseMenu.CheckboxItemIndicator>
      </span>
      {children}
    </BaseMenu.CheckboxItem>
  );
}

export function MenuRadioGroup(props: ComponentPropsWithoutRef<typeof BaseMenu.RadioGroup>) {
  return <BaseMenu.RadioGroup {...props} />;
}

export function MenuRadioItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseMenu.RadioItem>) {
  return (
    <BaseMenu.RadioItem className={cn(menuItemClasses, "pl-8", className)} {...props}>
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <BaseMenu.RadioItemIndicator>
          <Circle className="h-2 w-2 fill-current" />
        </BaseMenu.RadioItemIndicator>
      </span>
      {children}
    </BaseMenu.RadioItem>
  );
}

// Plain styled label safe to use anywhere inside MenuContent. For an
// aria-associated label, wrap items in <MenuGroup> and use <MenuGroupLabel> instead.
export function MenuLabel({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div className={cn("px-2 py-1.5 text-xs font-semibold text-fg-muted", className)} {...props} />
  );
}

export function MenuGroup(props: ComponentPropsWithoutRef<typeof BaseMenu.Group>) {
  return <BaseMenu.Group {...props} />;
}

export function MenuGroupLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseMenu.GroupLabel>) {
  return (
    <BaseMenu.GroupLabel
      className={cn("px-2 py-1.5 text-xs font-semibold text-fg-muted", className)}
      {...props}
    />
  );
}

export function MenuSeparator({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function MenuShortcut({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span className={cn("ml-auto text-xs tracking-widest text-fg-subtle", className)} {...props} />
  );
}

export function MenuSubmenuIndicator({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span className={cn("ml-auto", className)} {...props}>
      <ChevronRight className="h-4 w-4" />
    </span>
  );
}
