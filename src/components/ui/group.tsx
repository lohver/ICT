import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { type HTMLAttributes, forwardRef } from "react";

const groupVariants = cva("flex flex-row", {
  variants: {
    gap: {
      "0": "gap-0",
      "1": "gap-1",
      "2": "gap-2",
      "3": "gap-3",
      "4": "gap-4",
      "6": "gap-6",
      "8": "gap-8",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
      baseline: "items-baseline",
    },
    justify: {
      start: "justify-start",
      center: "justify-center",
      end: "justify-end",
      between: "justify-between",
      around: "justify-around",
    },
    wrap: {
      true: "flex-wrap",
      false: "flex-nowrap",
    },
  },
  defaultVariants: { gap: "2", align: "center", justify: "start", wrap: false },
});

export interface GroupProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof groupVariants> {}

export const Group = forwardRef<HTMLDivElement, GroupProps>(
  ({ className, gap, align, justify, wrap, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(groupVariants({ gap, align, justify, wrap }), className)}
      {...props}
    />
  ),
);
Group.displayName = "Group";
