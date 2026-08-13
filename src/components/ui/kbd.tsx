import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

export const Kbd = forwardRef<HTMLElement, HTMLAttributes<HTMLElement>>(
  ({ className, ...props }, ref) => (
    <kbd
      ref={ref}
      className={cn(
        "inline-flex items-center rounded border border-border bg-bg-muted px-1.5 py-0.5",
        "font-mono text-xs font-medium text-fg-muted shadow-sm",
        className,
      )}
      {...props}
    />
  ),
);
Kbd.displayName = "Kbd";
