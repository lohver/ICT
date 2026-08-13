// ============================================================
// Orchestration engine — deterministic, explainable.
// Computes eligibility + advisory from source fields at load time.
// Every determination returns a reason trace (rule fired + inputs).
// ============================================================
import {
  DEFAULT_FRESHNESS_DAYS,
  FIELD_LABELS,
  FIELD_PROVENANCE,
  FRESHNESS_DAYS,
  NOW,
  pesRank,
  TOS_LIABLE,
  VOCATIONS,
} from "./constants";
import type {
  AdvisorySignal,
  BlockReason,
  EligibilityResult,
  Field,
  IctWindow,
  NSman,
  NSmanSource,
  RuleEval,
  RuleInput,
} from "./types";

// ---------- date helpers ----------
function daysBetween(a: string, b: string): number {
  const ms = new Date(a).getTime() - new Date(b).getTime();
  return Math.round(ms / 86_400_000);
}

/** A field is stale when its asOf is older than the field's freshness window. */
export function isStale(fieldKey: string, f: Field<unknown>): boolean {
  const threshold = FRESHNESS_DAYS[fieldKey] ?? DEFAULT_FRESHNESS_DAYS;
  return daysBetween(NOW, f.asOf) > threshold;
}

export function freshnessThreshold(fieldKey: string): number {
  return FRESHNESS_DAYS[fieldKey] ?? DEFAULT_FRESHNESS_DAYS;
}

export function ageInDays(f: Field<unknown>): number {
  return daysBetween(NOW, f.asOf);
}

function inputFrom(key: string, f: Field<unknown>, valueOverride?: string): RuleInput {
  return {
    label: FIELD_LABELS[key] ?? key,
    value: valueOverride ?? String(f.value),
    source: f.source,
    asOf: f.asOf,
    stale: isStale(key, f),
    provenance: f.provenance ?? FIELD_PROVENANCE[key],
  };
}

/** True when [aStart,aEnd] overlaps the given ICT window. */
function overlapsICT(aStart: string, aEnd: string, w: IctWindow): boolean {
  return aStart <= w.endDate && aEnd >= w.startDate;
}

// ============================================================
// Eligibility resolution — block rules applied in order; first
// match sets the state. Returns the full ordered trace (§6a).
// ============================================================
export function resolveEligibility(n: NSmanSource, window: IctWindow): EligibilityResult {
  const trace: RuleEval[] = [];
  let decided = false;
  let state: EligibilityResult["state"] = { status: "Eligible" };
  let decidedBy: string | undefined;

  const req = VOCATIONS[n.vocation.value];

  // Rule 0 — Call-Up Deviation (OASIS block mechanism). A non-empty
  // deviation array blocks; the reasonLabel is surfaced verbatim.
  {
    const devs = n.callUpDeviation.value;
    const fired = devs.length > 0;
    trace.push({
      id: "R0-deviation",
      label: "No open Call-Up Deviation",
      result: fired ? "block" : "pass",
      detail: fired
        ? `Blocked — Call-Up Deviation: ${devs.map((d) => d.reasonLabel).join("; ")}`
        : "No Call-Up Deviation on record",
      inputs: [
        inputFrom(
          "callUpDeviation",
          n.callUpDeviation,
          fired ? devs.map((d) => `${d.reasonCode} ${d.reasonLabel}`).join(", ") : "none",
        ),
      ],
    });
    if (!decided && fired) {
      state = {
        status: "Blocked",
        reason: devs[0].reasonLabel,
        code: devs[0].reasonCode,
        detail: "Call-Up Deviation",
      };
      decidedBy = "R0-deviation";
      decided = true;
    }
  }

  // Rule TOS — Type-of-Service liability. Current non-liable TOS blocks;
  // a future-dated TOS overlapping the ICT window needs a check.
  {
    const tos = n.typeOfService.value;
    const currentLiable = TOS_LIABLE.has(tos.current);
    const overlappingFuture = tos.futureDated.find((f) =>
      overlapsICT(f.startDate, f.endDate, window),
    );
    const fired = !currentLiable || !!overlappingFuture;
    trace.push({
      id: "R-tos",
      label: "Liable for service across the ICT window",
      result: decided ? "skipped" : fired ? (!currentLiable ? "block" : "needs-check") : "pass",
      detail: !currentLiable
        ? `Blocked — current TOS "${tos.current}" is not ICT-liable`
        : overlappingFuture
          ? `Needs check — future-dated TOS "${overlappingFuture.tosCode}" (${overlappingFuture.startDate}→${overlappingFuture.endDate}) overlaps the ICT`
          : `Liable — current TOS "${tos.current}"`,
      inputs: [inputFrom("typeOfService", n.typeOfService, tos.current)],
    });
    if (!decided && fired) {
      if (!currentLiable) {
        state = {
          status: "Blocked",
          reason: "TOS — non-liable",
          detail: `Current TOS ${tos.current}`,
        };
      } else {
        state = {
          status: "NeedsCheck",
          reason: `Future-dated TOS ${overlappingFuture!.tosCode} overlaps the ICT window`,
        };
      }
      decidedBy = "R-tos";
      decided = true;
    }
  }

  // Rule Overseas — active exit permit / border-out spanning the ICT.
  {
    const th = n.travelHistory.value;
    const permit = th.exitPermits.find((p) => overlapsICT(p.start, p.end, window));
    const fired = !!permit;
    trace.push({
      id: "R-overseas",
      label: "Not overseas across the ICT window",
      result: decided ? "skipped" : fired ? "block" : "pass",
      detail: fired
        ? `Blocked — exit permit ${permit!.start}→${permit!.end} spans the ICT window`
        : "No exit permit overlapping the ICT window",
      inputs: [
        inputFrom(
          "travelHistory",
          n.travelHistory,
          fired ? `exit permit ${permit!.start}→${permit!.end}` : `${th.exitPermits.length} exit permit(s)`,
        ),
      ],
    });
    if (!decided && fired) {
      state = {
        status: "Blocked",
        reason: "Overseas — exit permit",
        detail: `Exit permit ${permit!.start}→${permit!.end}`,
      };
      decidedBy = "R-overseas";
      decided = true;
    }
  }

  // Rule 1 — PES meets role requirement
  const pesOk = req ? pesRank(n.pes.value) <= pesRank(req.minPES) : true;
  {
    const fired = !pesOk;
    trace.push({
      id: "R1-pes",
      label: "PES meets role requirement",
      result: fired ? "block" : "pass",
      detail: req
        ? fired
          ? `Blocked — PES ${n.pes.value} below ${n.vocation.value} requirement ${req.minPES}`
          : `PES ${n.pes.value} meets ${n.vocation.value} requirement ${req.minPES}`
        : `No PES requirement mapped for ${n.vocation.value}`,
      inputs: [inputFrom("pes", n.pes), inputFrom("vocation", n.vocation)],
    });
    if (!decided && fired) {
      state = {
        status: "Blocked",
        reason: "Down-PES / medical",
        detail: `PES ${n.pes.value} below role requirement ${req?.minPES}`,
      };
      decidedBy = "R1-pes";
      decided = true;
    }
  }

  // Rule 2 — Deferment (approved deferment blocks)
  {
    const fired = n.defermentStatus.value === "Approved";
    trace.push({
      id: "R2-deferment",
      label: "No approved deferment",
      result: decided ? "skipped" : fired ? "block" : "pass",
      detail: fired
        ? "Blocked — deferment approved for this ORNS cycle"
        : `Deferment status: ${n.defermentStatus.value}`,
      inputs: [inputFrom("defermentStatus", n.defermentStatus)],
    });
    if (!decided && fired) {
      state = { status: "Blocked", reason: "Deferment", detail: "Approved deferment on record" };
      decidedBy = "R2-deferment";
      decided = true;
    }
  }

  // Rule 3 — Availability (IHL / disruption / overseas / <6-month)
  {
    const av = n.availability.value;
    const fired = av !== "Available";
    trace.push({
      id: "R3-availability",
      label: "Available for the ICT window",
      result: decided ? "skipped" : fired ? "block" : "pass",
      detail: fired ? `Blocked — ${av}` : "Available",
      inputs: [inputFrom("availability", n.availability)],
    });
    if (!decided && fired) {
      // av is one of the availability BlockReason members when not "Available".
      state = { status: "Blocked", reason: av as BlockReason, detail: av };
      decidedBy = "R3-availability";
      decided = true;
    }
  }

  // Rule 4 — Licence hard-required for role (Driver): expired → Blocked
  {
    const hardLicence = !!req?.requiresLicence;
    const fired = hardLicence && n.licence.value === "Expired";
    trace.push({
      id: "R4-licence",
      label: "Licence valid where role-required",
      result: decided ? "skipped" : !hardLicence ? "pass" : fired ? "block" : "pass",
      detail: !hardLicence
        ? `Licence not hard-required for ${n.vocation.value}`
        : fired
          ? `Blocked — ${n.vocation.value} requires a valid licence; on record: Expired`
          : `Licence ${n.licence.value} valid for ${n.vocation.value}`,
      inputs: [inputFrom("licence", n.licence), inputFrom("vocation", n.vocation)],
    });
    if (!decided && fired) {
      state = {
        status: "Blocked",
        reason: "Clearance / licence expired",
        detail: `${n.vocation.value} licence expired (hard-required)`,
      };
      decidedBy = "R4-licence";
      decided = true;
    }
  }

  // Rule Offences — open disciplinary state / AWOL → NeedsCheck (route to human)
  {
    const off = n.offences.value;
    const openCount = off.current.filter((o) => o.status === "open").length;
    const fired = openCount > 0 || off.awol;
    trace.push({
      id: "R-offences",
      label: "No open disciplinary state",
      result: decided ? "skipped" : fired ? "needs-check" : "pass",
      detail: fired
        ? `Needs check — ${off.awol ? "AWOL on parade-state history" : `${openCount} open offence(s)`}; route to human`
        : "No open offence / AWOL",
      inputs: [
        inputFrom(
          "offences",
          n.offences,
          `${openCount} open, ${off.past.length} past${off.awol ? ", AWOL" : ""}`,
        ),
      ],
    });
    if (!decided && fired) {
      state = {
        status: "NeedsCheck",
        reason: off.awol ? "AWOL on record — verify with unit" : "Open disciplinary state — verify",
      };
      decidedBy = "R-offences";
      decided = true;
    }
  }

  // Rule 5 — Clearance / licence currency (soft) → NeedsCheck
  {
    const clr = n.clearanceG50.value;
    const softLicenceExpired = !req?.requiresLicence && n.licence.value === "Expired";
    const fired = clr === "Expired" || clr === "Pending" || softLicenceExpired;
    const which =
      clr === "Expired"
        ? "clearance (G50) expired"
        : clr === "Pending"
          ? "clearance (G50) pending renewal"
          : "licence expired";
    trace.push({
      id: "R5-clearance",
      label: "Clearance / licence current",
      result: decided ? "skipped" : fired ? "needs-check" : "pass",
      detail: fired ? `Needs check — ${which}, renewal pending` : "Clearance current",
      inputs: [inputFrom("clearanceG50", n.clearanceG50), inputFrom("licence", n.licence)],
    });
    if (!decided && fired) {
      state = { status: "NeedsCheck", reason: `${which} — awaiting renewal` };
      decidedBy = "R5-clearance";
      decided = true;
    }
  }

  // Rule Medical/IPPT — currency read from the richer records → NeedsCheck
  {
    const ip = n.ippt.value;
    const activeExcuse = n.medicalHistory.value.some((m) =>
      overlapsICT(m.date, m.date, window),
    );
    const ipptStale = ip.currentWindow === "Fail";
    const fired = ipptStale || activeExcuse || ip.stationExcuses.length > 0;
    const why = ipptStale
      ? `IPPT ${ip.currentWindow} this window`
      : ip.stationExcuses.length > 0
        ? `station excuse(s): ${ip.stationExcuses.join(", ")}`
        : "active medical excuse over the ICT window";
    trace.push({
      id: "R-medical",
      label: "Medical / IPPT currency",
      result: decided ? "skipped" : fired ? "needs-check" : "pass",
      detail: fired ? `Needs check — ${why}` : "IPPT current, no active medical excuse",
      inputs: [
        inputFrom("ippt", n.ippt, `current ${ip.currentWindow}`),
        inputFrom("medicalHistory", n.medicalHistory, `${n.medicalHistory.value.length} entry(ies)`),
      ],
    });
    if (!decided && fired) {
      state = { status: "NeedsCheck", reason: why };
      decidedBy = "R-medical";
      decided = true;
    }
  }

  // Rule 6 — Critical field unresolved (missing/conflicted PES or clearance) → NeedsCheck
  {
    const conflicted = !!n.pes.conflict || !!n.clearanceG50.conflict;
    const fired = conflicted;
    trace.push({
      id: "R6-critical",
      label: "No unresolved critical-field conflict",
      result: decided ? "skipped" : fired ? "needs-check" : "pass",
      detail: fired
        ? "Needs check — a critical field (PES / clearance) has an unresolved source conflict"
        : "Critical fields resolved",
      inputs: [inputFrom("pes", n.pes), inputFrom("clearanceG50", n.clearanceG50)],
    });
    if (!decided && fired) {
      state = { status: "NeedsCheck", reason: "Unresolved critical-field conflict" };
      decidedBy = "R6-critical";
      decided = true;
    }
  }

  return { state, decidedBy, trace };
}

// ============================================================
// AI advisory layer — mocked, deterministic, clearly separated
// from the rules-based decision layer (§6b). Never gates eligibility.
// ============================================================
function hashSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

export function computeAdvisory(n: NSmanSource, eligibility: EligibilityResult): AdvisorySignal {
  const jitter = hashSeed(n.id); // 0..1 stable per record

  // Anomaly flag — "check this record". Fire on structural oddities.
  let anomaly: string | undefined;
  const staleCritical =
    isStale("pes", n.pes) || isStale("clearanceG50", n.clearanceG50);
  if (n.pes.conflict && n.clearanceG50.conflict) {
    anomaly = "Two critical fields conflict at source simultaneously — verify record.";
  } else if (
    eligibility.state.status === "Eligible" &&
    staleCritical &&
    jitter > 0.55
  ) {
    anomaly = "Marked Eligible but a critical field is stale — recommend a fresh pull.";
  } else if (n.ipptStatus.value === "FIT (Non-Mandatory)" && n.pes.value === "A" && jitter > 0.8) {
    anomaly = "PES A with non-mandatory IPPT status — unusual pairing.";
  }

  return { anomaly };
}

// ============================================================
// Enrich a raw source record into a full NSman.
// ============================================================
export function enrich(n: NSmanSource, window: IctWindow): NSman {
  const eligibilityTrace = resolveEligibility(n, window);
  const advisory = computeAdvisory(n, eligibilityTrace);
  return {
    ...n,
    eligibility: eligibilityTrace.state,
    eligibilityTrace,
    advisory,
  };
}

// ============================================================
// Plain-language "why" — LLM-style prose over the deterministic
// reason trace (§6b — explains facts the rules produced; never decides).
// ============================================================
export function plainLanguageWhy(n: NSman): string {
  const s = n.eligibility;
  const name = `${n.rank} ${n.name}`;
  if (s.status === "Eligible") {
    return `${name} is cleared for this ICT. His PES (${n.pes.value}) meets the ${n.vocation.value} requirement, he holds no approved deferment, he is available across the window, and his clearance is current. He may be selected without further checks.`;
  }
  if (s.status === "Blocked") {
    return `Unfortunately, ${name} cannot be called up for this ICT — he is blocked on account of ${s.reason.toLowerCase()}${
      s.detail ? ` (${s.detail.toLowerCase()})` : ""
    }. He can only be included once the block is cleared through an unblock request.`;
  }
  return `${name} may be selected, but the layer has flagged one detail for a decision before he is confirmed on the roll: ${s.reason}. This is a caution rather than a block — the reconciled record has surfaced it; whether to include him is the commander's call.`;
}

// ============================================================
// Roll-level summary over a set of records — eligibility counts.
// ============================================================
export interface RollSummary {
  total: number;
  eligible: number;
  blocked: number;
  needsCheck: number;
}

export function computeRollSummary(records: NSman[]): RollSummary {
  return {
    total: records.length,
    eligible: records.filter((r) => r.eligibility.status === "Eligible").length,
    blocked: records.filter((r) => r.eligibility.status === "Blocked").length,
    needsCheck: records.filter((r) => r.eligibility.status === "NeedsCheck").length,
  };
}
