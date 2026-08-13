import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

export function Pagination({ className, ...props }: ComponentPropsWithoutRef<"nav">) {
  return (
    <nav
      aria-label="Pagination"
      className={cn("mx-auto flex w-full justify-center", className)}
      {...props}
    />
  );
}

export function PaginationContent({ className, ...props }: ComponentPropsWithoutRef<"ul">) {
  return <ul className={cn("flex flex-row items-center gap-1", className)} {...props} />;
}

export function PaginationItem({ className, ...props }: ComponentPropsWithoutRef<"li">) {
  return <li className={cn("", className)} {...props} />;
}

const pageButtonBase = cn(
  "inline-flex h-9 min-w-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors",
  "focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
  "disabled:pointer-events-none disabled:opacity-50",
);

export function PaginationLink({
  className,
  isActive,
  ...props
}: ComponentPropsWithoutRef<"a"> & { isActive?: boolean }) {
  return (
    <a
      aria-current={isActive ? "page" : undefined}
      className={cn(
        pageButtonBase,
        isActive
          ? "border border-border bg-bg text-fg font-semibold"
          : "text-fg-muted hover:bg-bg-muted hover:text-fg",
        className,
      )}
      {...props}
    />
  );
}

export function PaginationPrevious({ className, ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      aria-label="Go to previous page"
      className={cn(
        pageButtonBase,
        "gap-1 text-fg-muted hover:bg-bg-muted hover:text-fg",
        className,
      )}
      {...props}
    >
      <ChevronLeft className="h-4 w-4" />
      <span>Previous</span>
    </a>
  );
}

export function PaginationNext({ className, ...props }: ComponentPropsWithoutRef<"a">) {
  return (
    <a
      aria-label="Go to next page"
      className={cn(
        pageButtonBase,
        "gap-1 text-fg-muted hover:bg-bg-muted hover:text-fg",
        className,
      )}
      {...props}
    >
      <span>Next</span>
      <ChevronRight className="h-4 w-4" />
    </a>
  );
}

export function PaginationEllipsis({ className, ...props }: ComponentPropsWithoutRef<"span">) {
  return (
    <span
      aria-hidden
      className={cn("flex h-9 w-9 items-center justify-center text-fg-muted", className)}
      {...props}
    >
      <MoreHorizontal className="h-4 w-4" />
      <span className="sr-only">More pages</span>
    </span>
  );
}
