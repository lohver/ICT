import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  Radio,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { UNIT_NAME } from "@/domain/constants";
import { EligibilityBadge } from "@/components/signals";

const STAGES = [
  { key: "compiled", label: "Roll compiled", icon: ClipboardCheck, endpoint: "Orchestration layer" },
  { key: "approval", label: "Sent for approval", icon: Send, endpoint: "Approving officer (mocked)" },
  { key: "broadcast", label: "Broadcast to NSmen", icon: Radio, endpoint: "OneNS comms (mocked)" },
] as const;

export function Handoff() {
  const { records, selected, go, clearSelection, ictWindow } = useStore();
  const selectedList = records.filter((n) => selected.has(n.id));
  const [stage, setStage] = useState(0); // index of current in-progress stage

  useEffect(() => {
    if (selectedList.length === 0) return;
    if (stage >= STAGES.length) return;
    const t = setTimeout(() => setStage((s) => s + 1), 1100);
    return () => clearTimeout(t);
  }, [stage, selectedList.length]);

  if (selectedList.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm font-medium text-fg">No NSmen selected yet</p>
        <p className="max-w-sm text-sm text-fg-muted">
          Go back to the nominal roll and select NSmen for the ICT before sending for approval.
        </p>
        <Button onClick={() => go("roll")}>
          <ArrowLeft className="size-4" />
          Back to roll
        </Button>
      </div>
    );
  }

  const done = stage >= STAGES.length;
  const bySubUnit = new Map<string, number>();
  for (const n of selectedList)
    bySubUnit.set(n.subUnit, (bySubUnit.get(n.subUnit) ?? 0) + 1);
  const needsCheckCount = selectedList.filter((n) => n.eligibility.status === "NeedsCheck").length;

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => go("roll")}
        className="flex w-fit items-center gap-1.5 text-sm text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
      >
        <ArrowLeft className="size-4" />
        Back to nominal roll
      </button>

      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-fg sm:text-2xl">Handoff to approval &amp; comms</h1>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col gap-0 sm:flex-row sm:items-start sm:gap-0">
            {STAGES.map((s, i) => {
              const complete = i < stage;
              const active = i === stage;
              const Icon = s.icon;
              return (
                <div key={s.key} className="flex flex-1 gap-3 sm:flex-col sm:items-center sm:text-center">
                  <div className="flex flex-col items-center sm:w-full sm:flex-row">
                    <span className="hidden flex-1 sm:block">
                      {i > 0 && (
                        <span
                          className={cn(
                            "block h-0.5 w-full",
                            i <= stage ? "bg-accent" : "bg-border",
                          )}
                        />
                      )}
                    </span>
                    <span
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-full border-2 transition-colors",
                        complete
                          ? "border-accent bg-accent text-accent-fg"
                          : active
                            ? "border-accent bg-surface text-accent"
                            : "border-border bg-surface text-fg-subtle",
                      )}
                    >
                      {complete ? (
                        <Check className="size-5" />
                      ) : active ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <Icon className="size-5" />
                      )}
                    </span>
                    <span className="hidden flex-1 sm:block">
                      {i < STAGES.length - 1 && (
                        <span
                          className={cn(
                            "block h-0.5 w-full",
                            i < stage ? "bg-accent" : "bg-border",
                          )}
                        />
                      )}
                    </span>
                  </div>
                  <div className="pb-4 sm:pb-0 sm:pt-2">
                    <p className={cn("text-sm font-medium", complete || active ? "text-fg" : "text-fg-subtle")}>
                      {s.label}
                    </p>
                    <p className="text-xs text-fg-subtle">{s.endpoint}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {done && (
        <Alert variant="success">
          <CheckCircle2 />
          <AlertTitle>Selection handed off</AlertTitle>
          <AlertDescription>
            {selectedList.length} NSmen sent for approval for the ICT of {ictWindow.startDate} →{" "}
            {ictWindow.endDate}, and queued for broadcast. In a live system the approval leg
            (Phase 2) would route blocks/exceptions and notify on decision.
          </AlertDescription>
        </Alert>
      )}

      {/* Selected roll summary */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Selection summary</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">Unit</span>
              <span className="font-medium text-fg">{UNIT_NAME}</span>
            </div>
            <div className="flex items-start justify-between gap-3 text-sm">
              <span className="text-fg-muted">Sub-units</span>
              <span className="text-right font-medium text-fg">
                {[...bySubUnit.keys()].join(", ")}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-fg-muted">ICT window</span>
              <span className="font-medium tabular-nums text-fg">
                {ictWindow.startDate} → {ictWindow.endDate}
              </span>
            </div>
            <Separator />
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-fg-muted">Total selected</span>
              <span className="text-2xl font-bold tabular-nums text-fg">{selectedList.length}</span>
            </div>
            <Separator />
            <p className="text-[11px] font-medium uppercase tracking-wide text-fg-subtle">By sub-unit</p>
            {[...bySubUnit.entries()].map(([su, c]) => (
              <div key={su} className="flex items-center justify-between text-sm">
                <span className="text-fg-muted">{su}</span>
                <span className="font-medium tabular-nums text-fg">{c}</span>
              </div>
            ))}
            {needsCheckCount > 0 && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-xs text-warning">
                  <Badge variant="warning">{needsCheckCount} needs-check</Badge>
                  <span className="text-fg-subtle">included — flagged for the approver</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Nominal roll being sent</CardTitle>
          </CardHeader>
          <CardContent className="flex max-h-96 flex-col overflow-y-auto py-0">
            {selectedList.map((n) => (
              <div
                key={n.id}
                className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-fg">
                    {n.rank} {n.name}
                  </p>
                  <p className="text-xs text-fg-subtle">
                    {n.subUnit.replace(" Coy", "")} · {n.vocation.value} · PES {n.pes.value}
                  </p>
                </div>
                <EligibilityBadge state={n.eligibility} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => go("roll")}>
          <ArrowLeft className="size-4" />
          Adjust selection
        </Button>
        {done && (
          <Button
            variant="ghost"
            onClick={() => {
              clearSelection();
              go("dashboard");
            }}
          >
            Start a new roll
          </Button>
        )}
      </div>
    </div>
  );
}
