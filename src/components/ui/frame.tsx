import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { type HTMLAttributes, forwardRef } from "react";

const frameVariants = cva("w-full", {
  variants: {
    padding: {
      none: "",
      sm: "px-4 py-4",
      md: "px-6 py-6",
      lg: "px-8 py-8",
      xl: "px-12 py-12",
    },
    maxWidth: {
      sm: "max-w-sm mx-auto",
      md: "max-w-2xl mx-auto",
      lg: "max-w-4xl mx-auto",
      xl: "max-w-6xl mx-auto",
      "2xl": "max-w-7xl mx-auto",
      full: "",
    },
  },
  defaultVariants: { padding: "md", maxWidth: "xl" },
});

export interface FrameProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof frameVariants> {}

export const Frame = forwardRef<HTMLDivElement, FrameProps>(
  ({ className, padding, maxWidth, ...props }, ref) => (
    <div ref={ref} className={cn(frameVariants({ padding, maxWidth }), className)} {...props} />
  ),
);
Frame.displayName = "Frame";
