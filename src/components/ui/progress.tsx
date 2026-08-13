"use client";

import { cn } from "@/lib/utils";
import { Progress as BaseProgress } from "@base-ui-components/react/progress";
import type { ComponentPropsWithoutRef } from "react";

export function Progress({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseProgress.Root>) {
  return (
    <BaseProgress.Root className={cn("relative w-full", className)} {...props}>
      <BaseProgress.Track className="h-2 w-full overflow-hidden rounded-full bg-bg-muted">
        <BaseProgress.Indicator className="h-full bg-accent transition-[width] duration-300 ease-out" />
      </BaseProgress.Track>
    </BaseProgress.Root>
  );
}
