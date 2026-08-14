import type { ReactNode } from "react";
import {
  BadgeCheck,
  Ban,
  CircleAlert,
  GitCompareArrows,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import type {
  EligibilityResult,
  EligibilityState,
  Field,
  RuleEval,
} from "@/domain/types";
import { ageInDays, freshnessThreshold, isStale } from "@/domain/engine";
import { ASPIRATIONAL_NOTE, FIELD_LABELS, FIELD_PROVENANCE, HOLE_NOTE } from "@/domain/constants";
import type { Provenance } from "@/domain/types";

// ------------------------------------------------------------
// Provenance — confirmed / gap / hole. No pills or blurb in the UI;
// gap/hole fields still flag "aspirational" on the Source row.
// ------------------------------------------------------------
export function fieldProvenance(fieldKey: string, field?: { provenance?: Provenance }): Provenance {
  return field?.provenance ?? FIELD_PROVENANCE[fieldKey] ?? "confirmed";
}

// ------------------------------------------------------------
// Eligibility badge — variant maps to state.
// ------------------------------------------------------------
export function eligibilityVariant(s: EligibilityState["status"]) {
  return s === "Eligible" ? "success" : s === "Blocked" ? "danger" : "warning";
}

function EligibilityIcon({ status }: { status: EligibilityState["status"] }) {
  const cls = "size-3.5";
  if (status === "Eligible") return <BadgeCheck className={cls} />;
  if (status === "Blocked") return <Ban className={cls} />;
  return <CircleAlert className={cls} />;
}

export function eligibilityLabel(s: EligibilityState): string {
  if (s.status === "Eligible") return "Eligible";
  if (s.status === "Blocked") return "Blocked";
  return "Needs check";
}

/** Static eligibility badge (no popover). */
export function EligibilityBadge({ state }: { state: EligibilityState }) {
  return (
    <Badge variant={eligibilityVariant(state.status)}>
      <EligibilityIcon status={state.status} />
      {eligibilityLabel(state)}
    </Badge>
  );
}

// ------------------------------------------------------------
// Rule-trace row (used inside the eligibility explain popover).
// ------------------------------------------------------------
function ResultDot({ result }: { result: RuleEval["result"] }) {
  // "cannot-evaluate" (a hole) reads as a hollow ring — evaluated, but no verdict.
  if (result === "cannot-evaluate") {
    return <span className="mt-1.5 size-2 shrink-0 rounded-full border-2 border-border-strong" />;
  }
  const color =
    result === "block"
      ? "bg-danger"
      : result === "needs-check"
        ? "bg-warning"
        : result === "pass"
          ? "bg-success"
          : "bg-border-strong";
  return <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", color)} />;
}

export function RuleTrace({ trace, decidedBy }: { trace: RuleEval[]; decidedBy?: string }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {trace.map((r) => {
        const decided = r.id === decidedBy;
        return (
          <li key={r.id} className="flex gap-2">
            <ResultDot result={r.result} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    decided ? "text-fg" : "text-fg-muted",
                  )}
                >
                  {r.label}
                </span>
                {decided && (
                  <span className="rounded-xs bg-accent/10 px-1 text-[10px] font-medium uppercase tracking-wide text-accent">
                    decided
                  </span>
                )}
                {r.result === "skipped" && (
                  <span className="text-[10px] uppercase tracking-wide text-fg-subtle">
                    not reached
                  </span>
                )}
                {r.result === "cannot-evaluate" && (
                  <span className="rounded-xs bg-bg-muted px-1 text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
                    cannot evaluate · hole
                  </span>
                )}
              </div>
              <p className="text-xs text-fg-muted">{r.detail}</p>
              {r.result !== "skipped" && r.inputs.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                  {r.inputs.map((inp, i) => (
                    <span
                      key={`${r.id}-${i}`}
                      className="text-[11px] text-fg-subtle"
                      title={inp.source ? `${inp.source} · as of ${inp.asOf}` : undefined}
                    >
                      <span className="font-medium text-fg-muted">{inp.label}:</span>{" "}
                      {inp.value}
                      {inp.source && (
                        <span className="text-fg-subtle">
                          {" "}
                          · {inp.source}
                          {inp.stale && <span className="text-warning"> · stale</span>}
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/** Clickable eligibility badge → reveals the reason trace (spec §6a). */
export function EligibilityExplain({
  result,
  className,
}: {
  result: EligibilityResult;
  className?: string;
}) {
  const s = result.state;
  const summary =
    s.status === "Eligible"
      ? "All checks passed"
      : s.status === "Blocked"
        ? s.detail && s.detail !== s.reason
          ? `${s.reason} — ${s.detail}`
          : s.reason
        : s.reason;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent",
              className,
            )}
            aria-label={`Explain eligibility: ${eligibilityLabel(s)}`}
          />
        }
      >
        <EligibilityBadge state={s} />
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,26rem)]">
        <PopoverHeader>
          <PopoverTitle>Eligibility — {eligibilityLabel(s)}</PopoverTitle>
          <PopoverDescription>{summary}</PopoverDescription>
        </PopoverHeader>
        <Separator className="my-3" />
        <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
          Rules evaluated (in order)
        </p>
        <RuleTrace trace={result.trace} decidedBy={result.decidedBy} />
      </PopoverContent>
    </Popover>
  );
}

// ------------------------------------------------------------
// Field provenance — value + stale/conflict flags, click reveals
// source + as-of + threshold + conflict resolution (spec §6a).
// ------------------------------------------------------------
export function FieldProvenance<T>({
  fieldKey,
  field,
  render,
}: {
  fieldKey: string;
  field: Field<T>;
  render?: (v: T) => ReactNode;
}) {
  const stale = isStale(fieldKey, field);
  const label = FIELD_LABELS[fieldKey] ?? fieldKey;
  const display = render ? render(field.value) : String(field.value);
  const prov = fieldProvenance(fieldKey, field);
  const provNote = prov === "hole" ? HOLE_NOTE : prov === "gap" ? ASPIRATIONAL_NOTE : null;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="group inline-flex items-center gap-1.5 rounded-sm text-left outline-none hover:bg-bg-muted focus-visible:ring-2 focus-visible:ring-accent"
            aria-label={`Provenance for ${label}`}
          />
        }
      >
        <span className="text-sm text-fg">{display}</span>
        {stale && <Clock className="size-3.5 text-warning" aria-label="stale" />}
        {field.conflict && (
          <GitCompareArrows className="size-3.5 text-info" aria-label="source conflict" />
        )}
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,22rem)]">
        <PopoverHeader>
          <PopoverTitle>{label}</PopoverTitle>
        </PopoverHeader>
        <Separator className="my-3" />
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-xs">
          <dt className="text-fg-subtle">Value</dt>
          <dd className="font-medium text-fg">{display}</dd>
          <dt className="text-fg-subtle">Source</dt>
          <dd className="text-fg">
            {field.source}
            {provNote && <span className="text-warning"> · {provNote}</span>}
          </dd>
          <dt className="text-fg-subtle">As of</dt>
          <dd className="text-fg">
            {field.asOf}{" "}
            <span className="text-fg-subtle">({ageInDays(field)}d ago)</span>
          </dd>
          <dt className="text-fg-subtle">Freshness</dt>
          <dd className={stale ? "text-warning" : "text-success"}>
            {stale ? "Stale" : "Fresh"} · threshold {freshnessThreshold(fieldKey)}d
          </dd>
        </dl>
        {field.conflict && (
          <>
            <Separator className="my-3" />
            <div className="rounded-md border border-info/30 bg-info/5 p-2.5">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-info">
                <GitCompareArrows className="size-3.5" /> Source conflict — resolved
              </p>
              <p className="text-xs text-fg-muted">
                Took <span className="font-medium text-fg">{field.conflict.takenFrom}</span> ={" "}
                <span className="font-medium text-fg">{String(field.value)}</span>.
              </p>
              <p className="mt-1 text-xs text-fg-muted">
                Also seen:{" "}
                {field.conflict.alsoSeen
                  .map((a) => `${a.source} = ${a.value}`)
                  .join(", ")}
                .
              </p>
              <p className="mt-1 text-[11px] text-fg-subtle">
                Precedence: {field.conflict.precedence}
              </p>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
