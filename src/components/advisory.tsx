import { Sparkles, TriangleAlert } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { AdvisorySignal } from "@/domain/types";

/** Shared "AI — advisory" label chip. Every AI output carries this so it is
 *  unmistakably a suggestion, separated from the deterministic layer (§6b). */
export function AiTag({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border border-dashed border-accent/50 bg-accent/5 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-accent",
        className,
      )}
    >
      <Sparkles className="size-3" />
      AI · advisory
    </span>
  );
}

/** Anomaly "check this record" flag — only rendered when present. */
export function AnomalyFlag({ advisory }: { advisory: AdvisorySignal }) {
  if (!advisory.anomaly) return null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
            aria-label="Anomaly flag — check this record"
          />
        }
      >
        <span className="inline-flex items-center gap-1 rounded-full border border-dashed border-warning/60 bg-warning/10 px-1.5 py-0.5 text-[10px] font-medium text-warning">
          <TriangleAlert className="size-3" />
          check
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,22rem)]">
        <PopoverHeader>
          <PopoverTitle className="flex items-center gap-2">
            Anomaly flag
            <AiTag />
          </PopoverTitle>
          <PopoverDescription>
            An AI suggestion to review this record. Advisory only.
          </PopoverDescription>
        </PopoverHeader>
        <Separator className="my-3" />
        <p className="text-xs text-fg-muted">{advisory.anomaly}</p>
      </PopoverContent>
    </Popover>
  );
}
