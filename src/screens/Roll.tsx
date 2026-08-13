import { useMemo, useState } from "react";
import {
  ChevronRight,
  ListChecks,
  RefreshCw,
  Search,
  SendHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import { IctWindowBar } from "@/components/IctWindowBar";
import { SUB_UNITS, VOCATION_NAMES } from "@/domain/constants";
import {
  EligibilityExplain,
  eligibilityLabel,
} from "@/components/signals";
import type { NSman } from "@/domain/types";

const ELIG_OPTIONS = ["All", "Eligible", "NeedsCheck", "Blocked"] as const;

function statusOf(n: NSman) {
  return n.eligibility.status;
}

// ---- readiness at-a-glance mini-badges ----
// A deliberate at-a-glance summary of confirmed readiness; the full picture
// (medical history, IPPT detail, attendance, SAR-21/G50 currency) is in the drill-down.
function ReadinessGlance({ n }: { n: NSman }) {
  const ippt = n.ipptStatus.value;
  const med = n.medical.value;
  const chip = (label: string, val: string, tone: "success" | "warning" | "danger" | "subtle") => (
    <Badge variant={tone} className="px-1.5 py-0 text-[10px]">
      {label} {val}
    </Badge>
  );
  const ipptTone = ippt === "Pass" ? "success" : ippt === "Fail" ? "danger" : "subtle";
  return (
    <div className="flex flex-wrap gap-1">
      {chip("IPPT", ippt === "FIT (Non-Mandatory)" ? "FIT" : ippt, ipptTone)}
      {med !== "None" && chip("Medical", med, "warning")}
    </div>
  );
}

export function Roll() {
  const { records, selected, toggle, clearSelection, selectMany, openDrilldown, go, changes } =
    useStore();

  const [q, setQ] = useState("");
  const [subUnit, setSubUnit] = useState("All");
  const [vocation, setVocation] = useState("All");
  const [elig, setElig] = useState<(typeof ELIG_OPTIONS)[number]>("All");
  const [hideBlocked, setHideBlocked] = useState(false);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return records.filter((n) => {
      if (subUnit !== "All" && n.subUnit !== subUnit) return false;
      if (vocation !== "All" && n.vocation.value !== vocation) return false;
      if (elig !== "All" && n.eligibility.status !== elig) return false;
      if (hideBlocked && n.eligibility.status === "Blocked") return false;
      if (query) {
        const hay = `${n.rank} ${n.name} ${n.nric} ${n.vocation.value} ${n.appointmentHeld.value}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [records, q, subUnit, vocation, elig, hideBlocked]);

  const selectedList = records.filter((n) => selected.has(n.id));
  const selectedStrength = selectedList.length;
  const anyFilter =
    subUnit !== "All" || vocation !== "All" || elig !== "All" || hideBlocked || q;

  const cleanEligibleInView = filtered.filter((n) => n.eligibility.status === "Eligible");

  const resetFilters = () => {
    setQ("");
    setSubUnit("All");
    setVocation("All");
    setElig("All");
    setHideBlocked(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold text-fg sm:text-2xl">Nominal roll</h1>
      </div>

      {/* ICT activity window — resolved against this period, not "today" */}
      <IctWindowBar />

      {/* Filters */}
      <div className="rounded-lg border border-border bg-surface p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
          <div className="flex-1 lg:min-w-[220px]">
            <label className="mb-1 block text-xs font-medium text-fg-muted">Search</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, rank, NRIC, vocation…"
                className="pl-8"
              />
            </div>
          </div>
          <FilterSelect label="Sub-unit" value={subUnit} onChange={setSubUnit} options={["All", ...SUB_UNITS]} />
          <FilterSelect label="Vocation" value={vocation} onChange={setVocation} options={["All", ...VOCATION_NAMES]} />
          <FilterSelect
            label="Eligibility"
            value={elig}
            onChange={(v) => setElig(v as (typeof ELIG_OPTIONS)[number])}
            options={[...ELIG_OPTIONS]}
            renderOption={(o) => (o === "NeedsCheck" ? "Needs check" : o)}
          />
          <div className="flex items-center gap-2 pb-1">
            <Switch checked={hideBlocked} onCheckedChange={setHideBlocked} id="hide-blocked" />
            <label htmlFor="hide-blocked" className="text-sm text-fg-muted">
              Hide blocked
            </label>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <p className="text-xs text-fg-subtle">
            Showing <span className="font-medium text-fg-muted">{filtered.length}</span> of{" "}
            {records.length}
          </p>
          {anyFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Selection toolbar */}
      <div className="sticky top-[104px] z-20 flex flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex flex-col">
            <span className="text-xs text-fg-subtle">Selected strength</span>
            <span className="text-lg font-bold tabular-nums text-fg">{selectedStrength}</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => selectMany(cleanEligibleInView.map((n) => n.id))}
          >
            <ListChecks className="size-4" />
            Select eligible{anyFilter ? " (in view)" : ""} ({cleanEligibleInView.length})
          </Button>
          {selectedStrength > 0 && (
            <Button variant="ghost" size="sm" onClick={clearSelection}>
              <X className="size-4" />
              Clear
            </Button>
          )}
          <Button size="sm" disabled={selectedStrength === 0} onClick={() => go("handoff")}>
            <SendHorizontal className="size-4" />
            Send for approval
          </Button>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden rounded-lg border border-border bg-surface lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10" />
              <TableHead>Rank / Name</TableHead>
              <TableHead>NRIC</TableHead>
              <TableHead>Sub-unit</TableHead>
              <TableHead>Vocation</TableHead>
              <TableHead>PES</TableHead>
              <TableHead>Eligibility</TableHead>
              <TableHead>Readiness</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((n) => {
              const blocked = statusOf(n) === "Blocked";
              const isSel = selected.has(n.id);
              return (
                <TableRow
                  key={n.id}
                  data-state={isSel ? "selected" : undefined}
                  className={cn("cursor-pointer", blocked && "opacity-70")}
                  onClick={() => openDrilldown(n.id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSel}
                      disabled={blocked}
                      onCheckedChange={() => toggle(n.id)}
                      aria-label={`Select ${n.name}`}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-fg">{n.name}</p>
                      <p className="text-xs text-fg-subtle">
                        {n.rank} · {n.appointmentHeld.value}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-xs text-fg-muted">{n.nric}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{n.subUnit.replace(" Coy", "")}</TableCell>
                  <TableCell className="text-sm text-fg-muted">{n.vocation.value}</TableCell>
                  <TableCell className="text-sm font-medium text-fg">{n.pes.value}</TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <EligibilityExplain result={n.eligibilityTrace} />
                      {changes.has(n.id) && (
                        <Badge variant="info" className="gap-1 px-1.5 py-0 text-[10px]">
                          <RefreshCw className="size-3" />
                          changed
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <ReadinessGlance n={n} />
                  </TableCell>
                  <TableCell>
                    <ChevronRight className="size-4 text-fg-subtle" />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {filtered.length === 0 && <EmptyRoll onReset={resetFilters} />}
      </div>

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 lg:hidden">
        {filtered.map((n) => {
          const blocked = statusOf(n) === "Blocked";
          const isSel = selected.has(n.id);
          return (
            <div
              key={n.id}
              className={cn(
                "rounded-lg border bg-surface p-3",
                isSel ? "border-accent ring-1 ring-accent/40" : "border-border",
                blocked && "opacity-80",
              )}
            >
              <div className="flex items-start gap-3">
                <div className="pt-0.5">
                  <Checkbox
                    checked={isSel}
                    disabled={blocked}
                    onCheckedChange={() => toggle(n.id)}
                    aria-label={`Select ${n.name}`}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openDrilldown(n.id)}
                      className="min-w-0 truncate text-left font-semibold text-fg outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {n.name}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => openDrilldown(n.id)}
                    className="block text-left outline-none"
                  >
                    <p className="text-xs text-fg-subtle">
                      {n.rank} · {n.subUnit.replace(" Coy", "")} · {n.vocation.value} · PES {n.pes.value}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-fg-subtle">{n.nric}</p>
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => openDrilldown(n.id)}
                  aria-label={`Open ${n.name}`}
                  className="shrink-0 outline-none"
                >
                  <ChevronRight className="size-4 text-fg-subtle" />
                </button>
              </div>
              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                <EligibilityExplain result={n.eligibilityTrace} />
                {changes.has(n.id) && (
                  <Badge variant="info" className="gap-1 px-1.5 py-0 text-[10px]">
                    <RefreshCw className="size-3" />
                    changed
                  </Badge>
                )}
              </div>
              <div className="mt-2">
                <ReadinessGlance n={n} />
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="rounded-lg border border-border bg-surface">
            <EmptyRoll onReset={resetFilters} />
          </div>
        )}
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  renderOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  renderOption?: (o: string) => string;
}) {
  return (
    <div className="flex min-w-[130px] flex-col">
      <label className="mb-1 block text-xs font-medium text-fg-muted">{label}</label>
      <Select value={value} onValueChange={(v) => onChange((v as string) ?? "All")}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {renderOption ? renderOption(o) : o === "All" ? `All ${label.toLowerCase()}s` : o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function EmptyRoll({ onReset }: { onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 p-10 text-center">
      <p className="text-sm font-medium text-fg">No NSmen match these filters</p>
      <button type="button" onClick={onReset} className="text-sm text-accent hover:underline">
        Clear filters
      </button>
    </div>
  );
}
