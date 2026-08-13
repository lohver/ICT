"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** Single-date picker — PRIZM Calendar composed with Popover + a Button trigger
 *  (the PRIZM "Date Picker" pattern: Calendar with input + popover). */
export function DatePicker({
  value,
  onChange,
  disabled,
  className,
  ariaLabel,
}: {
  value?: Date;
  onChange?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = value
    ? value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "Pick a date";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            aria-label={ariaLabel}
            className={cn("w-44 justify-start font-normal", className)}
          />
        }
      >
        <CalendarDays className="size-4 text-fg-muted" />
        {label}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2">
        <Calendar
          selected={value}
          defaultMonth={value}
          disabled={disabled}
          onSelect={(d) => {
            onChange?.(d);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
