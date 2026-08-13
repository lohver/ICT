"use client";

import { cn } from "@/lib/utils";
import { Combobox as BaseCombobox } from "@base-ui-components/react/combobox";
import { Check, ChevronsUpDown } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export const Combobox = BaseCombobox.Root;

export function ComboboxTrigger({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.Trigger>) {
  return (
    <BaseCombobox.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between rounded-md border border-border bg-bg px-3 py-2",
        "text-sm text-fg shadow-sm",
        "hover:bg-bg-subtle focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        "data-[popup-open]:outline-2 data-[popup-open]:outline-offset-2 data-[popup-open]:outline-accent",
        className,
      )}
      {...props}
    >
      {children ?? (
        <>
          <BaseCombobox.Value>
            {(v: unknown) => (v != null ? String(v) : "Select…")}
          </BaseCombobox.Value>
          <BaseCombobox.Icon>
            <ChevronsUpDown className="h-4 w-4 opacity-50" />
          </BaseCombobox.Icon>
        </>
      )}
    </BaseCombobox.Trigger>
  );
}

export function ComboboxInput({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.Input>) {
  return (
    <BaseCombobox.Input
      className={cn(
        "flex h-9 w-full rounded-md border border-border bg-bg px-3 py-2",
        "text-sm text-fg shadow-sm placeholder:text-fg-subtle",
        "focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
        "disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function ComboboxContent({
  className,
  sideOffset = 4,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.Popup> & { sideOffset?: number }) {
  return (
    <BaseCombobox.Portal>
      <BaseCombobox.Positioner sideOffset={sideOffset} className="z-50">
        <BaseCombobox.Popup
          className={cn(
            "max-h-[18rem] w-(--anchor-width) overflow-y-auto overscroll-contain rounded-md border border-border bg-surface-elevated shadow-md",
            "data-[starting-style]:opacity-0 data-[starting-style]:scale-95",
            "data-[ending-style]:opacity-0 data-[ending-style]:scale-95",
            "transition-all duration-150",
            className,
          )}
          {...props}
        />
      </BaseCombobox.Positioner>
    </BaseCombobox.Portal>
  );
}

export function ComboboxList({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.List>) {
  return <BaseCombobox.List className={cn("p-1", className)} {...props} />;
}

export function ComboboxItem({
  className,
  children,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.Item>) {
  return (
    <BaseCombobox.Item
      className={cn(
        "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm text-fg outline-none",
        "data-[highlighted]:bg-bg-muted data-[highlighted]:text-fg",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <BaseCombobox.ItemIndicator>
          <Check className="h-3.5 w-3.5" />
        </BaseCombobox.ItemIndicator>
      </span>
      {children}
    </BaseCombobox.Item>
  );
}

export function ComboboxEmpty({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.Empty>) {
  return (
    <BaseCombobox.Empty
      className={cn("py-6 text-center text-sm text-fg-muted empty:hidden", className)}
      {...props}
    />
  );
}

export function ComboboxGroup(props: ComponentPropsWithoutRef<typeof BaseCombobox.Group>) {
  return <BaseCombobox.Group {...props} />;
}

export function ComboboxGroupLabel({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseCombobox.GroupLabel>) {
  return (
    <BaseCombobox.GroupLabel
      className={cn("px-2 py-1.5 text-xs font-semibold text-fg-muted", className)}
      {...props}
    />
  );
}
