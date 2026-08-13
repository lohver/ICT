import { useMemo } from "react";
import {
  ArrowRight,
  BadgeCheck,
  Ban,
  CircleAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { IctWindowBar } from "@/components/IctWindowBar";
import { SUB_UNITS, VOCATION_NAMES } from "@/domain/constants";

function Tile({
  label,
  value,
  sub,
  icon,
  tone,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  tone: "success" | "danger" | "warning" | "accent";
}) {
  const toneCls = {
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning",
    accent: "text-accent",
  }[tone];
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg bg-bg-muted", toneCls)}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{label}</p>
          <p className="text-2xl font-bold tabular-nums text-fg">{value}</p>
          {sub && <p className="text-xs text-fg-muted">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function Bar({ label, count, total, tone }: { label: string; count: number; total: number; tone?: string }) {
  const pct = total ? (count / total) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-24 shrink-0 text-xs text-fg-muted">{label}</span>
      <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
        <div
          className={cn("h-full rounded-full", tone ?? "bg-accent")}
          style={{ width: `${Math.max(pct, count > 0 ? 4 : 0)}%` }}
        />
      </div>
      <span className="w-8 shrink-0 text-right text-xs font-medium tabular-nums text-fg">{count}</span>
    </div>
  );
}

export function Dashboard() {
  const { records, roll, go } = useStore();

  const bySubUnit = useMemo(
    () =>
      SUB_UNITS.map((su) => {
        const r = records.filter((x) => x.subUnit === su);
        return {
          su,
          total: r.length,
          eligible: r.filter((x) => x.eligibility.status === "Eligible").length,
          needs: r.filter((x) => x.eligibility.status === "NeedsCheck").length,
          blocked: r.filter((x) => x.eligibility.status === "Blocked").length,
        };
      }),
    [records],
  );

  const byVocation = useMemo(
    () =>
      VOCATION_NAMES.map((v) => ({
        v,
        count: records.filter((x) => x.vocation.value === v).length,
      })).sort((a, b) => b.count - a.count),
    [records],
  );

  const maxVoc = Math.max(...byVocation.map((x) => x.count), 1);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-fg sm:text-2xl">Unit readiness dashboard</h1>
      </div>

      {/* ICT activity window — the roll is resolved against this period */}
      <IctWindowBar />

      {/* Summary tiles */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Tile
          label="Eligible"
          value={roll.eligible}
          sub={`${((roll.eligible / roll.total) * 100).toFixed(0)}% of ${roll.total}`}
          tone="success"
          icon={<BadgeCheck className="size-5" />}
        />
        <Tile
          label="Needs check"
          value={roll.needsCheck}
          tone="warning"
          icon={<CircleAlert className="size-5" />}
        />
        <Tile
          label="Blocked"
          value={roll.blocked}
          tone="danger"
          icon={<Ban className="size-5" />}
        />
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">By sub-unit</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {bySubUnit.map((s) => (
              <div key={s.su} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-fg">{s.su}</span>
                  <span className="text-xs text-fg-muted">{s.total} pax</span>
                </div>
                <div className="flex h-2.5 overflow-hidden rounded-full bg-bg-muted">
                  <div className="h-full bg-success" style={{ width: `${(s.eligible / s.total) * 100}%` }} />
                  <div className="h-full bg-warning" style={{ width: `${(s.needs / s.total) * 100}%` }} />
                  <div className="h-full bg-danger" style={{ width: `${(s.blocked / s.total) * 100}%` }} />
                </div>
                <div className="flex gap-4 text-xs text-fg-muted">
                  <span><span className="font-medium text-success">{s.eligible}</span> eligible</span>
                  <span><span className="font-medium text-warning">{s.needs}</span> needs check</span>
                  <span><span className="font-medium text-danger">{s.blocked}</span> blocked</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">By vocation</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2.5">
            {byVocation.map((x) => (
              <Bar key={x.v} label={x.v} count={x.count} total={maxVoc} />
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold text-fg">Ready to build the ICT nominal roll</p>
          <p className="text-sm text-fg-muted">
            Select eligible NSmen for approval.
          </p>
        </div>
        <Button size="lg" onClick={() => go("roll")} className="shrink-0">
          Generate nominal roll for ICT
          <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
