import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { useStore } from "@/store";

/** Parse an ISO date (yyyy-mm-dd) as a local-midnight Date. */
function toDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
/** Format a Date to a local ISO date (yyyy-mm-dd), no timezone drift. */
function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** ICT activity window control — capture the dates and shift them ("what-if").
 *  The roll is resolved against this window, never against "today". */
export function IctWindowBar() {
  const { ictWindow, setIctWindow, shiftWindow, resetWindow, changes } = useStore();

  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">ICT start</label>
            <DatePicker
              ariaLabel="ICT start date"
              value={toDate(ictWindow.startDate)}
              onChange={(d) => setIctWindow({ ...ictWindow, startDate: toISO(d) })}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-fg-muted">ICT end</label>
            <DatePicker
              ariaLabel="ICT end date"
              value={toDate(ictWindow.endDate)}
              onChange={(d) => setIctWindow({ ...ictWindow, endDate: toISO(d) })}
            />
          </div>
        </div>
        <div className="flex items-center gap-2 pb-0.5">
          <span className="text-xs text-fg-subtle">Shift the window:</span>
          <Button variant="outline" size="sm" onClick={() => shiftWindow(-7)}>
            <ChevronLeft className="size-4" />
            1 week
          </Button>
          <Button variant="outline" size="sm" onClick={() => shiftWindow(7)}>
            1 week
            <ChevronRight className="size-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetWindow}>
            Reset
          </Button>
        </div>
      </div>
      {changes.size > 0 && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-warning">
          <RefreshCw className="size-3.5" />
          {changes.size} record{changes.size > 1 ? "s" : ""} changed eligibility when the window moved.
        </p>
      )}
    </div>
  );
}
