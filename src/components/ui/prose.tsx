import { cn } from "@/lib/utils";
import { type HTMLAttributes, forwardRef } from "react";

export const Prose = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "max-w-none text-fg",
        // headings
        "[&_h1]:mb-4 [&_h1]:text-3xl [&_h1]:font-semibold [&_h1]:tracking-tight",
        "[&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight",
        "[&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-xl [&_h3]:font-semibold",
        "[&_h4]:mb-2 [&_h4]:mt-4 [&_h4]:text-base [&_h4]:font-semibold",
        // paragraphs
        "[&_p]:mb-4 [&_p]:text-base [&_p]:leading-7",
        // lists
        "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1",
        "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1",
        "[&_li]:text-base [&_li]:leading-7",
        // inline elements
        "[&_strong]:font-semibold",
        "[&_em]:italic",
        "[&_a]:text-accent [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-accent-hover",
        // code
        "[&_code]:rounded [&_code]:bg-bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm",
        "[&_pre]:mb-4 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:border-border [&_pre]:bg-bg-muted [&_pre]:p-4",
        "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
        // blockquote
        "[&_blockquote]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-fg-muted [&_blockquote]:italic",
        // hr
        "[&_hr]:my-8 [&_hr]:border-border",
        // table
        "[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm",
        "[&_th]:border [&_th]:border-border [&_th]:bg-bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:font-medium",
        "[&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2",
        className,
      )}
      {...props}
    />
  ),
);
Prose.displayName = "Prose";
