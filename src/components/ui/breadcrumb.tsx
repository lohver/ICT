import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";
import { type ComponentProps, forwardRef } from "react";

export const Breadcrumb = forwardRef<HTMLElement, ComponentProps<"nav">>(
  ({ className, ...props }, ref) => (
    <nav ref={ref} aria-label="Breadcrumb" className={cn("text-sm", className)} {...props} />
  ),
);
Breadcrumb.displayName = "Breadcrumb";

export const BreadcrumbList = forwardRef<HTMLOListElement, ComponentProps<"ol">>(
  ({ className, ...props }, ref) => (
    <ol
      ref={ref}
      className={cn("flex flex-wrap items-center gap-1.5 text-fg-muted", className)}
      {...props}
    />
  ),
);
BreadcrumbList.displayName = "BreadcrumbList";

export const BreadcrumbItem = forwardRef<HTMLLIElement, ComponentProps<"li">>(
  ({ className, ...props }, ref) => (
    <li ref={ref} className={cn("inline-flex items-center gap-1.5", className)} {...props} />
  ),
);
BreadcrumbItem.displayName = "BreadcrumbItem";

export const BreadcrumbLink = forwardRef<HTMLAnchorElement, ComponentProps<"a">>(
  ({ className, ...props }, ref) => (
    <a ref={ref} className={cn("transition-colors hover:text-fg", className)} {...props} />
  ),
);
BreadcrumbLink.displayName = "BreadcrumbLink";

export const BreadcrumbPage = forwardRef<HTMLSpanElement, ComponentProps<"span">>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      aria-current="page"
      className={cn("font-medium text-fg", className)}
      {...props}
    />
  ),
);
BreadcrumbPage.displayName = "BreadcrumbPage";

export function BreadcrumbSeparator({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      role="presentation"
      aria-hidden="true"
      className={cn("text-fg-subtle", className)}
      {...props}
    >
      <ChevronRight className="h-3.5 w-3.5" />
    </span>
  );
}
