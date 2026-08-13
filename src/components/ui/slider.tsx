"use client";

import { cn } from "@/lib/utils";
import { Slider as BaseSlider } from "@base-ui-components/react/slider";
import type { ComponentPropsWithoutRef } from "react";

export function Slider({ className, ...props }: ComponentPropsWithoutRef<typeof BaseSlider.Root>) {
  return (
    <BaseSlider.Root
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <BaseSlider.Control className="relative flex h-5 w-full items-center">
        <BaseSlider.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-bg-muted">
          <BaseSlider.Indicator className="absolute h-full bg-accent" />
        </BaseSlider.Track>
        <BaseSlider.Thumb
          className={cn(
            "block h-4 w-4 rounded-full border-2 border-accent bg-surface shadow-sm transition-colors",
            "focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
            "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          )}
        />
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
