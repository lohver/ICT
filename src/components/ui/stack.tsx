import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { type HTMLAttributes, forwardRef } from "react";

const stackVariants = cva("flex flex-col", {
  variants: {
    gap: {
      "0": "gap-0",
      "1": "gap-1",
      "2": "gap-2",
      "3": "gap-3",
      "4": "gap-4",
      "6": "gap-6",
      "8": "gap-8",
      "12": "gap-12",
    },
    align: {
      start: "items-start",
      center: "items-center",
      end: "items-end",
      stretch: "items-stretch",
    },
  },
  defaultVariants: { gap: "4", align: "stretch" },
});

export interface StackProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof stackVariants> {}

export const Stack = forwardRef<HTMLDivElement, StackProps>(
  ({ className, gap, align, ...props }, ref) => (
    <div ref={ref} className={cn(stackVariants({ gap, align }), className)} {...props} />
  ),
);
Stack.displayName = "Stack";
