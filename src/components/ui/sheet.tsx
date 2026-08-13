"use client";

import { cn } from "@/lib/utils";
import { Dialog as BaseDialog } from "@base-ui-components/react/dialog";
import { X } from "lucide-react";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export const Sheet = BaseDialog.Root;
export const SheetTrigger = BaseDialog.Trigger;
export const SheetClose = BaseDialog.Close;

const sideClasses = {
  left: "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm data-[starting-style]:-translate-x-full data-[ending-style]:-translate-x-full",
  right:
    "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full",
  top: "inset-x-0 top-0 w-full border-b data-[starting-style]:-translate-y-full data-[ending-style]:-translate-y-full",
  bottom:
    "inset-x-0 bottom-0 w-full border-t data-[starting-style]:translate-y-full data-[ending-style]:translate-y-full",
} as const;

export function SheetContent({
  className,
  children,
  side = "right",
  variant = "solid",
  showCloseButton = true,
  ...props
}: ComponentPropsWithoutRef<typeof BaseDialog.Popup> & {
  side?: keyof typeof sideClasses;
  variant?: "solid" | "glass";
  showCloseButton?: boolean;
  children?: ReactNode;
}) {
  return (
    <BaseDialog.Portal>
      <BaseDialog.Backdrop
        className={cn(
          "fixed inset-0 z-50 bg-bg/60 backdrop-blur-sm",
          "data-[starting-style]:opacity-0 data-[ending-style]:opacity-0",
          "transition-opacity duration-300",
        )}
      />
      <BaseDialog.Popup
        className={cn(
          "fixed z-50 flex flex-col shadow-lg border-border",
          "transition-transform duration-300",
          variant === "glass" ? "surface-glass-panel" : "bg-surface",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <BaseDialog.Close
            className={cn(
              "absolute right-4 top-4 rounded-sm text-fg-muted opacity-70 transition-opacity",
              "hover:opacity-100 focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </BaseDialog.Close>
        )}
      </BaseDialog.Popup>
    </BaseDialog.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn("flex flex-col gap-1.5 border-b border-border px-6 py-4", className)}
      {...props}
    />
  );
}

export function SheetTitle({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseDialog.Title>) {
  return (
    <BaseDialog.Title
      className={cn("text-lg font-semibold leading-none tracking-tight text-fg", className)}
      {...props}
    />
  );
}

export function SheetDescription({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseDialog.Description>) {
  return <BaseDialog.Description className={cn("text-sm text-fg-muted", className)} {...props} />;
}

export function SheetBody({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return <div className={cn("flex-1 overflow-y-auto px-6 py-4", className)} {...props} />;
}

export function SheetFooter({ className, ...props }: ComponentPropsWithoutRef<"div">) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border px-6 py-4 sm:justify-end",
        className,
      )}
      {...props}
    />
  );
}
