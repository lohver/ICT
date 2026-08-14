import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useStore } from "@/store";
import {
  EligibilityBadge,
  FieldProvenance,
  RuleTrace,
} from "@/components/signals";
import { AnomalyFlag } from "@/components/advisory";
import { plainLanguageWhy } from "@/domain/engine";
import { FIELD_LABELS } from "@/domain/constants";
import type {
  AttendanceOutcome,
  AttachmentType,
  CallUpDeviation,
  EligibilityState,
  IctWindow,
  NSman,
  Field,
} from "@/domain/types";

function labelFor(k: string) {
  return FIELD_LABELS[k] ?? k;
}

const overlaps = (start: string, end: string, w: IctWindow) =>
  start <= w.endDate && end >= w.startDate;

function stateSummary(s: EligibilityState): string {
  if (s.status === "Eligible") return "Eligible";
  if (s.status === "Blocked") return `Blocked — ${s.reason}`;
  return `Needs check — ${s.reason}`;
}

/** Plain-language "what this block means" for a commander, keyed off the rule
 *  that decided the block. Kept in one place so every block explains itself the
 *  same way (incl. reasons that don't have their own card). */
function blockExplanation(decidedBy?: string): string | null {
  switch (decidedBy) {
    case "R0-deviation":
      return "He's flagged not to be called up for this cycle. Include him only by raising an unblock request with a justification.";
    case "R1-pes":
      return "His PES doesn't meet the fitness standard this vocation requires, so he can't fill the role as-is.";
    case "R-tos":
      return "His type of service isn't liable for this ICT across these dates, so he can't be called up.";
    case "R-tenure":
      return "He hasn't served the minimum period required before this ICT. The exact minimum (around 6 months) still needs to be confirmed against policy.";
    case "R2-deferment":
      return "He has an approved deferment covering this ICT, so he's excused from this cycle.";
    case "R-overseas":
      return "He'll be overseas on an exit permit during the ICT window, so he isn't available.";
    case "R-ihl":
      return "He's on approved studies (IHL) over this period, so he isn't available.";
    case "R4-licence":
      return "This role needs a valid licence and his has expired, so he can't be deployed in it until it's renewed.";
    case "R-medical":
      return "He has a medical certificate (MC) covering the ICT dates, so he's excused from this activity.";
    default:
      return null;
  }
}

function KV({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-fg-subtle">{k}</dt>
      <dd className="text-sm text-fg">{v}</dd>
    </div>
  );
}

function FieldRow({
  fieldKey,
  field,
  render,
}: {
  fieldKey: string;
  field: Field<unknown>;
  render?: (v: unknown) => React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-0">
      <span className="text-sm text-fg-muted">{labelFor(fieldKey)}</span>
      <FieldProvenance fieldKey={fieldKey} field={field as Field<never>} render={render as never} />
    </div>
  );
}

/** Card header used by the data-set cards inside the Eligibility / Readiness tabs. */
function OasisCardHeader({
  title,
  note,
  source = "OneOASIS ICT-Management",
}: {
  title: string;
  note?: string;
  source?: string;
}) {
  return (
    <CardHeader>
      <CardTitle className="text-base">{title}</CardTitle>
      <p className="mt-0.5 text-xs text-fg-subtle">
        {note ? `${note} · ` : ""}Source: {source}
      </p>
    </CardHeader>
  );
}

const ATTACHMENT_META: Record<AttachmentType, { label: string; variant: "subtle" | "info" | "warning" }> = {
  organic: { label: "Organic", variant: "subtle" },
  "attached-in": { label: "Attached-in", variant: "info" },
  "detached-out": { label: "Detached-out", variant: "warning" },
};

const OUTCOME_LABEL: Record<AttendanceOutcome, string> = {
  ReportLate: "Reported late",
  MC: "Medical certificate",
  FailedInPro: "Failed in-processing",
  DeferredOutPro: "Deferred (out-processing)",
  AWOL: "Absent without leave",
  NoPayLeave: "No-pay leave",
  ChangeInTrainingPeriod: "Change in training period",
};

export function Drilldown() {
  const { focusId, byId, go, selected, toggle, records, openDrilldown, ictWindow, changes } =
    useStore();
  const n = focusId ? byId(focusId) : undefined;

  const suggestions = useMemo(() => (n ? successionSuggestions(n, records) : []), [n, records]);
  const [showTrace, setShowTrace] = useState(false);

  if (!n) {
    return (
      <div className="flex flex-col items-center gap-3 py-16">
        <p className="text-sm text-fg-muted">No NSman selected.</p>
        <Button onClick={() => go("roll")}>Back to roll</Button>
      </div>
    );
  }

  const overlapsICT = (start: string, end: string) => overlaps(start, end, ictWindow);
  const change = changes.get(n.id);
  const blocked = n.eligibility.status === "Blocked";
  const isSel = selected.has(n.id);
  const att = ATTACHMENT_META[n.attachment.value.type];
  const tos = n.typeOfService.value;
  const th = n.travelHistory.value;
  const ip = n.ippt.value;
  const off = n.offences.value;
  const ten = n.tenure.value;
  const nr = n.callUpNR.value;
  // Derived availability, decomposed back into a single at-a-glance label.
  const availabilitySummary = n.ihl.value.studying
    ? n.ihl.value.overseas
      ? "Overseas study"
      : "IHL / studying"
    : n.disruption.value.active
      ? (n.disruption.value.reason ?? "Disruption")
      : !ten.minServiceMet
        ? "Min service unconfirmed"
        : "Available";
  // Medical excuses / attendance exceptions that bear on ELIGIBILITY (both-tagged).
  const medicalOverWindow = n.medicalHistory.value.filter((m) => overlapsICT(m.date, m.date));
  const eligAttendance = n.attendance.value.filter((a) =>
    ["AWOL", "NoPayLeave", "DeferredOutPro", "FailedInPro"].includes(a.outcome),
  );

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

      {/* Identity header */}
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold text-fg">{n.name}</h1>
            <AnomalyFlag advisory={n.advisory} />
          </div>
          <p className="text-sm text-fg-muted">
            {n.rank} · {n.appointmentHeld.value} · {n.subUnit} · {n.unit}
          </p>
          <p className="font-mono text-xs text-fg-subtle">{n.nric}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <EligibilityBadge state={n.eligibility} />
            <Badge variant={att.variant}>{att.label}</Badge>
            {n.attachment.value.type === "attached-in" && (
              <span className="text-xs text-fg-subtle">from {n.attachment.value.homeUnit}</span>
            )}
            {n.attachment.value.type === "detached-out" && (
              <span className="text-xs text-fg-subtle">to {n.attachment.value.receivingUnit}</span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {blocked ? (
            <UnblockDialog n={n} />
          ) : isSel ? (
            <Button variant="outline" onClick={() => toggle(n.id)}>
              <Check className="size-4" />
              Selected
            </Button>
          ) : (
            <Button onClick={() => toggle(n.id)}>
              <Plus className="size-4" />
              Add to selection
            </Button>
          )}
        </div>
      </div>

      {/* AI plain-language why — advisory, separated */}
      <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Sparkles className="size-4 text-accent" />
          <span className="text-sm font-semibold text-fg">AI Summary</span>
        </div>
        <p className="text-sm text-fg-muted">{plainLanguageWhy(n)}</p>
      </div>

      {/* Eligibility flip caused by the ICT window moving */}
      {change && (
        <Alert variant="warning">
          <RefreshCw />
          <AlertTitle>Eligibility changed when the ICT window moved</AlertTitle>
          <AlertDescription>
            Was <span className="font-medium text-fg">{stateSummary(change.before)}</span> →
            now <span className="font-medium text-fg">{stateSummary(change.after)}</span>. This is
            driven by a date-dependent rule tested against {ictWindow.startDate} → {ictWindow.endDate};
            see the reason trace in the Eligibility tab.
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs — one page each for Summary / Eligibility / Readiness */}
      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Overview</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
        </TabsList>

        {/* Summary */}
        <TabsContent value="summary">
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-3 lg:grid-cols-4">
              <KV k="Service type" v={n.serviceType} />
              <KV k="Vocation" v={n.vocation.value} />
              <KV k="PES" v={n.pes.value} />
              <KV k="Appointment" v={n.appointmentHeld.value} />
              <KV k="Sub-unit" v={n.subUnit} />
              <KV k="Attachment" v={att.label} />
              <KV k="Current TOS" v={tos.current} />
              <KV k="ORNS years" v={`${n.ornsYears} of 10`} />
              <KV k="HK clocked" v={`${n.hkClocked} pts`} />
              <KV k="Availability" v={availabilitySummary} />
              <KV k="IPPT (window)" v={ip.currentWindow} />
              <KV k="Medical" v={n.medical.value} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ ELIGIBILITY — the decision + every input that feeds it ============ */}
        <TabsContent value="eligibility" className="flex flex-col gap-4">
          <Card>
            <CardHeader className="flex-row items-start justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-base">Resolved state</CardTitle>
                <p className="mt-0.5 text-sm text-fg-muted">
                  {n.eligibility.status === "Eligible"
                    ? "All block rules passed."
                    : n.eligibility.status === "Blocked"
                      ? `Blocked — ${n.eligibility.reason}${n.eligibility.detail ? `: ${n.eligibility.detail}` : ""}`
                      : `Needs check — ${n.eligibility.reason}`}
                </p>
                {n.eligibility.status === "Blocked" &&
                  blockExplanation(n.eligibilityTrace.decidedBy) && (
                    <p className="mt-1.5 text-sm text-fg">
                      {blockExplanation(n.eligibilityTrace.decidedBy)}
                    </p>
                  )}
                <button
                  type="button"
                  onClick={() => setShowTrace((v) => !v)}
                  className="mt-2 text-xs text-accent outline-none hover:underline focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {showTrace ? "Hide" : "Show"} rules evaluated ({n.eligibilityTrace.trace.length})
                </button>
              </div>
              <EligibilityBadge state={n.eligibility} />
            </CardHeader>
            {showTrace && (
              <CardContent className="pt-0">
                <RuleTrace trace={n.eligibilityTrace.trace} decidedBy={n.eligibilityTrace.decidedBy} />
              </CardContent>
            )}
          </Card>


          {/* Type of Service */}
          <Card>
            <OasisCardHeader title="Type of Service (TOS)" />
            <CardContent className="flex flex-col gap-4">
              <KV k="Current TOS" v={tos.current} />
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  Future-dated TOS
                </p>
                {tos.futureDated.length === 0 ? (
                  <p className="text-sm text-fg-muted">None.</p>
                ) : (
                  tos.futureDated.map((f, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0 text-sm">
                      <span className="text-fg">
                        {f.tosCode}{" "}
                        <span className="text-fg-subtle">· {f.startDate} → {f.endDate}</span>
                      </span>
                      {overlapsICT(f.startDate, f.endDate) && (
                        <Badge variant="warning">overlaps the ICT window</Badge>
                      )}
                    </div>
                  ))
                )}
              </div>
              <p className="text-xs text-fg-subtle">
                ICT window: {ictWindow.startDate} → {ictWindow.endDate}
              </p>
            </CardContent>
          </Card>

          {/* Travel History */}
          <Card>
            <OasisCardHeader title="Travel History" source="OneOASIS Travel History" />
            <CardContent className="flex flex-col gap-4">
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  Exit permits
                </p>
                {th.exitPermits.length === 0 ? (
                  <p className="text-sm text-fg-muted">No exit permits on record.</p>
                ) : (
                  th.exitPermits.map((p, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0 text-sm">
                      <span className="text-fg">{p.start} → {p.end}</span>
                      {overlapsICT(p.start, p.end) ? (
                        <Badge variant="danger">spans the ICT window</Badge>
                      ) : (
                        <span className="text-xs text-fg-subtle">outside the window</span>
                      )}
                    </div>
                  ))
                )}
              </div>
              <div>
                <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">
                  Border movements
                </p>
                {th.borderMovements.length === 0 ? (
                  <p className="text-sm text-fg-muted">No border movements on record.</p>
                ) : (
                  th.borderMovements.map((b, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0 text-sm">
                      <span className="text-fg">{b.date}</span>
                      <span className="text-fg-muted">{b.direction === "out" ? "Departed" : "Returned"}</span>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Offences */}
          <Card>
            <OasisCardHeader title="Offences" />
            <CardContent className="flex flex-col gap-4">
              {off.awol && (
                <Alert variant="warning">
                  <ShieldAlert />
                  <AlertTitle>AWOL on parade-state history</AlertTitle>
                  <AlertDescription>Derived from the attendance record (Readiness tab).</AlertDescription>
                </Alert>
              )}
              <OffenceList title="Current / open" items={off.current} empty="No open offences." />
              <OffenceList title="Past" items={off.past} empty="No past offences." />
            </CardContent>
          </Card>

          {/* Tenure / liability — confirmed; the 6-month threshold is unverified */}
          <Card>
            <OasisCardHeader title="Tenure / liability" source="eHR / OneOASIS org data" />
            <CardContent className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <KV k="ORNS years" v={`${ten.ornsYears} of 10`} />
                <KV k="HK clocked" v={`${ten.hkClocked} pts`} />
                <KV k="MUT" v={ten.mut} />
                <KV
                  k="Min service"
                  v={
                    <Badge variant={ten.minServiceMet ? "success" : "warning"}>
                      {ten.minServiceMet ? "Met" : "Unconfirmed"}
                    </Badge>
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Call-up NR validity */}
          <Card>
            <OasisCardHeader title="Call-up NR validity" source="OneOASIS Nominal Roll" />
            <CardContent className="grid grid-cols-2 gap-4">
              <KV k="Phase date" v={nr.phaseDate} />
              <KV k="Date reviewed" v={nr.dateReviewed} />
              <p className="col-span-2 text-xs text-fg-subtle">
                ICT window: {ictWindow.startDate} → {ictWindow.endDate}
              </p>
            </CardContent>
          </Card>

          {/* Both-tagged: Medical & Attendance — eligibility view (MC excusal / disciplinary) */}
          <Card>
            <OasisCardHeader
              title="Medical — eligibility view"
              note="Both eligibility & readiness"
              source="OneOASIS Medical Records → Comd WB"
            />
            <CardContent className="py-0">
              {medicalOverWindow.length === 0 ? (
                <p className="py-3 text-sm text-fg-muted">
                  No MC / medical excuse overlapping the ICT window. Full history in the Readiness tab.
                </p>
              ) : (
                medicalOverWindow.map((m, i) => (
                  <div key={i} className="border-b border-border py-2.5 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-fg">{m.excuse}</span>
                      <Badge variant="warning">overlaps the ICT window</Badge>
                    </div>
                    <p className="text-xs text-fg-muted">{m.excuseType} · {m.duration} · {m.date}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <OasisCardHeader
              title="Attendance — eligibility view"
              note="Both eligibility & readiness"
              source="OneOASIS Parade State Exceptions"
            />
            <CardContent className="py-0">
              {eligAttendance.length === 0 ? (
                <p className="py-3 text-sm text-fg-muted">
                  No AWOL / disciplinary-relevant parade-state exceptions. Full history in the Readiness tab.
                </p>
              ) : (
                eligAttendance.map((a, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-fg">{a.activityLabel}</p>
                      <p className="text-xs text-fg-subtle">{a.date}</p>
                    </div>
                    <Badge variant={a.outcome === "AWOL" ? "danger" : "subtle"}>{OUTCOME_LABEL[a.outcome]}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Other eligibility determinants (per-field provenance) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Other eligibility determinants</CardTitle>
            </CardHeader>
            <CardContent className="py-0">
              <FieldRow fieldKey="pes" field={n.pes} />
              <FieldRow fieldKey="vocation" field={n.vocation} />
              <FieldRow fieldKey="appointmentHeld" field={n.appointmentHeld} />
              <FieldRow fieldKey="defermentStatus" field={n.defermentStatus} />
              <FieldRow
                fieldKey="ihl"
                field={n.ihl}
                render={(v) => {
                  const h = v as NSman["ihl"]["value"];
                  return h.studying ? (h.overseas ? "Overseas study" : "Studying") : "Not studying";
                }}
              />
              <FieldRow
                fieldKey="disruption"
                field={n.disruption}
                render={(v) => {
                  const d = v as NSman["disruption"]["value"];
                  return d.active ? (d.reason ?? "Active") : "None";
                }}
              />
              <FieldRow fieldKey="clearanceG50" field={n.clearanceG50} />
              <FieldRow fieldKey="licence" field={n.licence} />
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ READINESS — the fuller picture + every field's provenance ============ */}
        <TabsContent value="readiness" className="flex flex-col gap-4">
          {/* IPPT */}
          <Card>
            <OasisCardHeader title="IPPT" />
            <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <KV k="Current window" v={ip.currentWindow} />
              <KV k="Past window" v={ip.pastWindow} />
              <KV k="Eligibility criteria" v={ip.eligibilityCriteria} />
              <KV k="NS Fit" v={ip.nsFit ? "Yes" : "No"} />
              <KV k="HSP" v={ip.hsp ? "Yes" : "No"} />
              <KV k="IPT / RT" v={ip.iptRt} />
              <KV
                k="Station excuses"
                v={ip.stationExcuses.length ? ip.stationExcuses.join(", ") : "None"}
              />
            </CardContent>
          </Card>

          {/* Medical */}
          <Card>
            <OasisCardHeader title="Medical history" />
            <CardContent className="py-0">
              {n.medicalHistory.value.length === 0 ? (
                <p className="py-3 text-sm text-fg-muted">No medical excuses on record.</p>
              ) : (
                n.medicalHistory.value.map((m, i) => (
                  <div key={i} className="border-b border-border py-2.5 last:border-0">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-fg">{m.excuse}</span>
                      <span className="text-xs text-fg-subtle">{m.date}</span>
                    </div>
                    <p className="text-xs text-fg-muted">
                      {m.excuseType} · {m.duration}
                      {overlapsICT(m.date, m.date) && (
                        <span className="text-warning"> · overlaps the ICT window</span>
                      )}
                    </p>
                    {m.remarks && <p className="text-xs text-fg-subtle">{m.remarks}</p>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Attendance */}
          <Card>
            <OasisCardHeader title="Attendance / parade state" />
            <CardContent className="py-0">
              {n.attendance.value.map((a, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border py-2.5 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-fg">{a.activityLabel}</p>
                    <p className="text-xs text-fg-subtle">{a.date}</p>
                  </div>
                  <Badge variant={a.outcome === "AWOL" ? "danger" : "subtle"}>
                    {OUTCOME_LABEL[a.outcome]}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Readiness / currency fields (per-field provenance) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Readiness &amp; currency fields</CardTitle>
            </CardHeader>
            <CardContent className="py-0">
              <FieldRow fieldKey="ipptStatus" field={n.ipptStatus} />
              <FieldRow fieldKey="sar21Currency" field={n.sar21Currency} />
              <FieldRow fieldKey="atmsTrainingReqMet" field={n.atmsTrainingReqMet} render={(v) => (v ? "Met" : "Not met")} />
              <FieldRow
                fieldKey="trainingStatus"
                field={n.trainingStatus}
                render={(v) => {
                  const t = v as NSman["trainingStatus"]["value"];
                  return t.mutRequired
                    ? "MUT required"
                    : t.refresherFor
                      ? `Refresher due (${t.refresherFor})`
                      : "Up to date";
                }}
              />
              <FieldRow fieldKey="licence" field={n.licence} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Succession suggestion — AI advisory */}
      {suggestions.length > 0 && (
        <div className="rounded-lg border border-dashed border-accent/40 bg-accent/5 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <span className="text-sm font-semibold text-fg">
              Could fill the {n.vocation.value} slot
            </span>
          </div>
          <p className="mb-2 text-xs text-fg-muted">
            If {n.rank} {n.name.split(" ")[0]} can't make this ICT, these eligible {n.vocation.value}s
            are the closest matches.
          </p>
          <div className="flex flex-col gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => openDrilldown(s.id)}
                className="flex items-center justify-between rounded-md border border-border bg-surface px-3 py-2 text-left outline-none hover:border-accent focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="text-sm text-fg">
                  {s.rank} {s.name}{" "}
                  <span className="text-fg-subtle">· {s.subUnit.replace(" Coy", "")} · PES {s.pes.value}</span>
                </span>
                <EligibilityBadge state={s.eligibility} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function OffenceList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { offenceType: string; date: string; status: string }[];
  empty: string;
}) {
  return (
    <div>
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-fg-subtle">{title}</p>
      {items.length === 0 ? (
        <p className="text-sm text-fg-muted">{empty}</p>
      ) : (
        items.map((o, i) => (
          <div key={i} className="flex items-center justify-between border-b border-border py-2 last:border-0 text-sm">
            <span className="text-fg">{o.offenceType} <span className="text-fg-subtle">· {o.date}</span></span>
            <Badge variant={o.status === "open" ? "danger" : "subtle"}>{o.status}</Badge>
          </div>
        ))
      )}
    </div>
  );
}

/** Unblock Servicemen request — one justification per Call-Up Deviation.
 *  Mocked submit-for-approval (no routing runs in v0). */
function UnblockDialog({ n }: { n: NSman }) {
  const deviations: CallUpDeviation[] =
    n.callUpDeviation.value.length > 0
      ? n.callUpDeviation.value
      : [
          {
            reasonCode: n.eligibility.status === "Blocked" ? n.eligibility.code ?? "BLOCK" : "BLOCK",
            reasonLabel: n.eligibility.status === "Blocked" ? n.eligibility.reason : "Block",
            illustrative: true,
          },
        ];
  const [texts, setTexts] = useState<string[]>(() => deviations.map(() => ""));
  const [submitted, setSubmitted] = useState(false);
  const allFilled = texts.every((t) => t.trim().length > 0);

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <ShieldAlert className="size-4" />
            Unblock request
          </Button>
        }
      />
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Unblock Servicemen request</DialogTitle>
          <DialogDescription>
            {n.rank} {n.name} · give a justification for each block reason below. On submit it goes
            to the approving officer for a decision. (Prototype — nothing is actually submitted.)
          </DialogDescription>
        </DialogHeader>

        {submitted ? (
          <Alert variant="success">
            <Check />
            <AlertTitle>Submitted for approval</AlertTitle>
            <AlertDescription>
              {deviations.length} justification{deviations.length > 1 ? "s" : ""} sent to the
              approving officer. He stays blocked until a decision comes back.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="flex max-h-[50vh] flex-col gap-4 overflow-y-auto">
            {deviations.map((d, i) => (
              <div key={i} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="danger">{d.reasonCode}</Badge>
                  <span className="text-sm font-medium text-fg">{d.reasonLabel}</span>
                </div>
                <Textarea
                  value={texts[i]}
                  onChange={(e) =>
                    setTexts((prev) => prev.map((t, j) => (j === i ? e.target.value : t)))
                  }
                  placeholder="Justification for this block…"
                  rows={3}
                />
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          {submitted ? (
            <DialogClose render={<Button variant="outline">Close</Button>} />
          ) : (
            <>
              <DialogClose render={<Button variant="ghost">Cancel</Button>} />
              <Button disabled={!allFilled} onClick={() => setSubmitted(true)}>
                Submit for approval
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function successionSuggestions(n: NSman, all: NSman[]): NSman[] {
  return all
    .filter(
      (x) =>
        x.id !== n.id &&
        x.vocation.value === n.vocation.value &&
        x.eligibility.status === "Eligible",
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 3);
}
