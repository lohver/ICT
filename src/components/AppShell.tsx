import type { ReactNode } from "react";
import { Layers, RadioTower } from "lucide-react";
import { UNIT_NAME } from "@/domain/constants";
import { useStore, type Screen } from "@/store";
import { cn } from "@/lib/utils";

const STEPS: { key: Screen; label: string }[] = [
  { key: "dashboard", label: "Dashboard" },
  { key: "roll", label: "Nominal roll" },
  { key: "handoff", label: "Handoff" },
];

function stepIndex(s: Screen): number {
  if (s === "drilldown") return 1; // drill-down sits within the roll step
  return STEPS.findIndex((x) => x.key === s);
}

export function AppShell({ children }: { children: ReactNode }) {
  const { screen, go, records, selected, ictWindow } = useStore();
  const active = stepIndex(screen);

  return (
    <div className="min-h-screen bg-bg">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur supports-[backdrop-filter]:bg-surface/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => go("dashboard")}
              className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-accent text-accent-fg">
                <Layers className="size-5" />
              </span>
              <span className="flex flex-col text-left leading-tight">
                <span className="text-sm font-semibold text-fg">
                  Readiness Orchestration Layer
                </span>
                <span className="text-xs text-fg-subtle">
                  ICTMS · v0 prototype
                </span>
              </span>
            </button>
          </div>

          {/* Unit strip + pipeline stepper */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2 text-sm">
              <RadioTower className="size-4 text-accent" />
              <span className="font-semibold text-fg">{UNIT_NAME}</span>
              <span className="text-fg-subtle">·</span>
              <span className="text-fg-muted">{records.length} strength</span>
              <span className="text-fg-subtle">·</span>
              <span className="text-fg-muted">
                ICT {ictWindow.startDate} → {ictWindow.endDate}
              </span>
            </div>
            <nav aria-label="Pipeline" className="flex items-center gap-1">
              {STEPS.map((s, i) => {
                const done = i < active;
                const current = i === active;
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => go(s.key)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      current
                        ? "bg-accent text-accent-fg"
                        : done
                          ? "text-accent hover:bg-accent/10"
                          : "text-fg-subtle hover:bg-bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-4 place-items-center rounded-full text-[10px]",
                        current
                          ? "bg-accent-fg/20"
                          : done
                            ? "bg-accent/15"
                            : "bg-bg-muted",
                      )}
                    >
                      {i + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                    {s.key === "roll" && selected.size > 0 && (
                      <span
                        className={cn(
                          "rounded-full px-1.5 text-[10px] font-semibold",
                          current ? "bg-accent-fg/20" : "bg-accent/15 text-accent",
                        )}
                      >
                        {selected.size}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">{children}</main>

      <footer className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6">
        <p className="text-xs text-fg-subtle">
          Prototype on <span className="font-medium text-fg-muted">synthetic data</span> — no
          real integrations. Schema/enums are grounded &amp; cited; values are illustrative
          demo texture only. Not for operational use.
        </p>
      </footer>
    </div>
  );
}
