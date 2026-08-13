"use client";

import { cn } from "@/lib/utils";
import { Radio as BaseRadio } from "@base-ui-components/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui-components/react/radio-group";
import type { ComponentPropsWithoutRef } from "react";

export function RadioGroup({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseRadioGroup>) {
  return <BaseRadioGroup className={cn("grid gap-2", className)} {...props} />;
}

export function RadioGroupItem({
  className,
  ...props
}: ComponentPropsWithoutRef<typeof BaseRadio.Root>) {
  return (
    <BaseRadio.Root
      className={cn(
        "peer inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface shadow-sm transition-colors",
        "data-[checked]:border-accent",
        "focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent",
        "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <BaseRadio.Indicator className="h-2 w-2 rounded-full bg-accent data-[unchecked]:hidden" />
    </BaseRadio.Root>
  );
}
