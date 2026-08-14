// ============================================================
// Orchestration engine — deterministic, explainable.
// Computes eligibility + advisory from source fields at load time.
// Every determination returns a reason trace (rule fired + inputs).
//
// Rule set + order mirror the KB "Eligibility data-source mapping"
// rules table. Precedence: BLOCKS win over NeedsCheck regardless of
// order (KB: "the first blocking rule sets the state"); NeedsCheck is
// raised only when no block fired. Readiness signals (IPPT, SAR-21,
// ATMS, MUT) never touch eligibility here — they inform selection only.
// ============================================================
import {
  DEFAULT_FRESHNESS_DAYS,
  FIELD_LABELS,
  FIELD_PROVENANCE,
  FRESHNESS_DAYS,
  MIN_SERVICE_MONTHS_UNVERIFIED,
  NOW,
  pesRank,
  TOS_LIABLE,
  VOCATIONS,
} from "./constants";
import type {
  AdvisorySignal,
  EligibilityResult,
  Field,
  IctWindow,
  NSman,
  NSmanSource,
  RuleEval,
  RuleInput,
  RuleResult,
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
// Eligibility resolution. Every rule is evaluated (no short-circuit)
// so the trace is complete; the OUTCOME is then the first Block by
// order, else the first NeedsCheck, else Eligible (KB rules table).
// A `cannot-evaluate` row (Disruption/newborn — a hole) never gates.
// ============================================================
export function resolveEligibility(n: NSmanSource, window: IctWindow): EligibilityResult {
  const trace: RuleEval[] = [];
  const req = VOCATIONS[n.vocation.value];

  let blockState: EligibilityResult["state"] | undefined;
  let blockBy: string | undefined;
  let needsState: EligibilityResult["state"] | undefined;
  let needsBy: string | undefined;

  function push(
    id: string,
    label: string,
    result: RuleResult,
    detail: string,
    inputs: RuleInput[],
    state?: EligibilityResult["state"],
  ) {
    trace.push({ id, label, result, detail, inputs });
    if (result === "block" && state && !blockState) {
      blockState = state;
      blockBy = id;
    } else if (result === "needs-check" && state && !needsState) {
      needsState = state;
      needsBy = id;
    }
  }

  // 1 — Call-Up Deviation (OASIS block mechanism) → Blocked (label verbatim).
  {
    const devs = n.callUpDeviation.value;
    const fired = devs.length > 0;
    push(
      "R0-deviation",
      "No open Call-Up Deviation",
      fired ? "block" : "pass",
      fired
        ? `Blocked — Call-Up Deviation: ${devs.map((d) => d.reasonLabel).join("; ")}`
        : "No Call-Up Deviation on record",
      [
        inputFrom(
          "callUpDeviation",
          n.callUpDeviation,
          fired ? devs.map((d) => `${d.reasonCode} ${d.reasonLabel}`).join(", ") : "none",
        ),
      ],
      fired
        ? {
            status: "Blocked",
            reason: devs[0].reasonLabel,
            code: devs[0].reasonCode,
            detail: "Call-Up Deviation",
          }
        : undefined,
    );
  }

  // 2 — PES vs role → Blocked.
  {
    const pesOk = req ? pesRank(n.pes.value) <= pesRank(req.minPES) : true;
    const fired = !pesOk;
    push(
      "R1-pes",
      "PES meets role requirement",
      fired ? "block" : "pass",
      req
        ? fired
          ? `Blocked — PES ${n.pes.value} below ${n.vocation.value} requirement ${req.minPES}`
          : `PES ${n.pes.value} meets ${n.vocation.value} requirement ${req.minPES}`
        : `No PES requirement mapped for ${n.vocation.value}`,
      [inputFrom("pes", n.pes), inputFrom("vocation", n.vocation)],
      fired
        ? {
            status: "Blocked",
            reason: "Down-PES / medical",
            detail: `PES ${n.pes.value} below role requirement ${req?.minPES}`,
          }
        : undefined,
    );
  }

  // 3 — Liability / TOS → Blocked. Current non-liable TOS, or a future-dated
  // TOS effective across the ICT window, blocks (KB: → Blocked, not liable).
  {
    const tos = n.typeOfService.value;
    const currentLiable = TOS_LIABLE.has(tos.current);
    const overlappingFuture = tos.futureDated.find((f) =>
      overlapsICT(f.startDate, f.endDate, window),
    );
    const fired = !currentLiable || !!overlappingFuture;
    push(
      "R-tos",
      "Liable for service across the ICT window",
      fired ? "block" : "pass",
      !currentLiable
        ? `Blocked — current TOS "${tos.current}" is not ICT-liable`
        : overlappingFuture
          ? `Blocked — future-dated TOS "${overlappingFuture.tosCode}" (${overlappingFuture.startDate}→${overlappingFuture.endDate}) is effective across the ICT window`
          : `Liable — current TOS "${tos.current}"`,
      [inputFrom("typeOfService", n.typeOfService, tos.current)],
      fired
        ? {
            status: "Blocked",
            reason: "TOS — non-liable",
            detail: !currentLiable
              ? `Current TOS ${tos.current}`
              : `Future-dated TOS ${overlappingFuture!.tosCode}`,
          }
        : undefined,
    );
  }

  // 4 — Tenure (min service before ICT) → Blocked. The "~6-month" threshold is
  // UNVERIFIED (KB); the block is honest about that in its detail/trace.
  {
    const t = n.tenure.value;
    const fired = !t.minServiceMet;
    push(
      "R-tenure",
      "Meets minimum service before the ICT",
      fired ? "block" : "pass",
      fired
        ? `Blocked — minimum service before ICT not met (${t.ornsYears} ORNS yr, ${t.hkClocked} HK); the ~${MIN_SERVICE_MONTHS_UNVERIFIED}-month threshold is unverified — confirm`
        : `Liable — ${t.ornsYears} ORNS year(s), ${t.hkClocked} HK pts, MUT ${t.mut}`,
      [inputFrom("tenure", n.tenure, `${t.ornsYears} ORNS yr, ${t.hkClocked} HK, MUT ${t.mut}`)],
      fired
        ? {
            status: "Blocked",
            reason: "Tenure — min service not met",
            detail: `~${MIN_SERVICE_MONTHS_UNVERIFIED}-month threshold unverified`,
          }
        : undefined,
    );
  }

  // 5 — Deferment → Blocked.
  {
    const fired = n.defermentStatus.value === "Approved";
    push(
      "R2-deferment",
      "No approved deferment",
      fired ? "block" : "pass",
      fired
        ? "Blocked — deferment approved for this ORNS cycle"
        : `Deferment status: ${n.defermentStatus.value}`,
      [inputFrom("defermentStatus", n.defermentStatus)],
      fired
        ? { status: "Blocked", reason: "Deferment", detail: "Approved deferment on record" }
        : undefined,
    );
  }

  // 6 — Overseas / exit permit → Blocked.
  {
    const th = n.travelHistory.value;
    const permit = th.exitPermits.find((p) => overlapsICT(p.start, p.end, window));
    const fired = !!permit;
    push(
      "R-overseas",
      "Not overseas across the ICT window",
      fired ? "block" : "pass",
      fired
        ? `Blocked — exit permit ${permit!.start}→${permit!.end} spans the ICT window`
        : "No exit permit overlapping the ICT window",
      [
        inputFrom(
          "travelHistory",
          n.travelHistory,
          fired ? `exit permit ${permit!.start}→${permit!.end}` : `${th.exitPermits.length} exit permit(s)`,
        ),
      ],
      fired
        ? {
            status: "Blocked",
            reason: "Overseas — exit permit",
            detail: `Exit permit ${permit!.start}→${permit!.end}`,
          }
        : undefined,
    );
  }

  // 7 — IHL (in-house learning / studies, incl. overseas study) → Blocked. gap feed.
  {
    const ihl = n.ihl.value;
    const fired = ihl.studying;
    push(
      "R-ihl",
      "Not on study non-availability (IHL)",
      fired ? "block" : "pass",
      fired
        ? `Blocked — ${ihl.overseas ? "overseas study" : "IHL / studying"}${ihl.institution ? ` (${ihl.institution})` : ""}`
        : "Not studying",
      [inputFrom("ihl", n.ihl, fired ? `studying${ihl.overseas ? " (overseas)" : ""}` : "not studying")],
      fired
        ? {
            status: "Blocked",
            reason: "IHL / studying",
            detail: ihl.overseas ? "Overseas study" : ihl.institution,
          }
        : undefined,
    );
  }

  // 8 — Licence hard-required for the role (Driver) → Blocked (gates the slot).
  {
    const hardLicence = !!req?.requiresLicence;
    const fired = hardLicence && n.licence.value === "Expired";
    push(
      "R4-licence",
      "Licence valid where role-required",
      fired ? "block" : "pass",
      !hardLicence
        ? `Licence not hard-required for ${n.vocation.value}`
        : fired
          ? `Blocked — ${n.vocation.value} requires a valid licence; on record: Expired`
          : `Licence ${n.licence.value} valid for ${n.vocation.value}`,
      [inputFrom("licence", n.licence), inputFrom("vocation", n.vocation)],
      fired
        ? {
            status: "Blocked",
            reason: "Clearance / licence expired",
            detail: `${n.vocation.value} licence expired (hard-required)`,
          }
        : undefined,
    );
  }

  // 9 — G50 clearance → NeedsCheck (expired / pending), or a soft (non-role)
  // licence expiry → NeedsCheck.
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
    push(
      "R5-clearance",
      "Clearance / licence current",
      fired ? "needs-check" : "pass",
      fired ? `Needs check — ${which}, renewal pending` : "Clearance current",
      [inputFrom("clearanceG50", n.clearanceG50), inputFrom("licence", n.licence)],
      fired ? { status: "NeedsCheck", reason: `${which} — awaiting renewal` } : undefined,
    );
  }

  // 10 — Offences / AWOL → NeedsCheck (route to a human).
  {
    const off = n.offences.value;
    const openCount = off.current.filter((o) => o.status === "open").length;
    const fired = openCount > 0 || off.awol;
    push(
      "R-offences",
      "No open disciplinary state",
      fired ? "needs-check" : "pass",
      fired
        ? `Needs check — ${off.awol ? "AWOL on parade-state history" : `${openCount} open offence(s)`}; route to human`
        : "No open offence / AWOL",
      [
        inputFrom(
          "offences",
          n.offences,
          `${openCount} open, ${off.past.length} past${off.awol ? ", AWOL" : ""}`,
        ),
      ],
      fired
        ? {
            status: "NeedsCheck",
            reason: off.awol ? "AWOL on record — verify with unit" : "Open disciplinary state — verify",
          }
        : undefined,
    );
  }

  // 11 — Call-up NR validity → NeedsCheck. A phase date long before the window,
  // or an NR not reviewed against it, is a stale-validity case (KB: a stale
  // blocking-relevant field resolves to NeedsCheck rather than a silent pass).
  {
    const nr = n.callUpNR.value;
    const phaseStale = daysBetween(window.startDate, nr.phaseDate) > 90; // cut well before the window
    const reviewStale = isStale("callUpNR", n.callUpNR);
    const fired = phaseStale || reviewStale;
    push(
      "R-nr",
      "Call-up NR valid for this window",
      fired ? "needs-check" : "pass",
      fired
        ? `Needs check — ${phaseStale ? `phase date ${nr.phaseDate} predates the ICT window` : `NR last reviewed ${nr.dateReviewed}, not against the current window`}`
        : `NR phase date ${nr.phaseDate}, reviewed ${nr.dateReviewed}`,
      [inputFrom("callUpNR", n.callUpNR, `phase ${nr.phaseDate}, reviewed ${nr.dateReviewed}`)],
      fired
        ? {
            status: "NeedsCheck",
            reason: phaseStale
              ? "Call-up NR phase date predates the ICT window — re-validate"
              : "Call-up NR not reviewed against the current window",
          }
        : undefined,
    );
  }

  // 12 — Medical / MC → Blocked (excused). An MC covering the ICT dates excuses
  // the man from the activity. NOTE: IPPT is deliberately NOT read here — it is
  // a READINESS signal and never gates eligibility (KB design rule).
  {
    const mc = n.medicalHistory.value.find(
      (m) => m.excuseType === "MC" && overlapsICT(m.date, m.date, window),
    );
    const fired = !!mc;
    push(
      "R-medical",
      "No MC excusing the ICT window",
      fired ? "block" : "pass",
      fired
        ? `Blocked (excused) — MC "${mc!.excuse}" (${mc!.duration}, ${mc!.date}) covers the ICT window`
        : "No MC covering the ICT window",
      [
        inputFrom(
          "medicalHistory",
          n.medicalHistory,
          fired ? `MC ${mc!.date} (${mc!.duration})` : `${n.medicalHistory.value.length} entry(ies)`,
        ),
      ],
      fired
        ? { status: "Blocked", reason: "Medical excusal (MC)", detail: "MC covers the ICT window" }
        : undefined,
    );
  }

  // 13 — Disruption / newborn / WOG → CANNOT EVALUATE. This data is captured
  // nowhere today (hole), so no rule can honestly fire on it. The row is shown
  // for transparency but never sets Blocked / NeedsCheck.
  {
    const dis = n.disruption.value;
    push(
      "R-disruption",
      "Disruption / newborn (WOG) — not a gate",
      dis.active ? "cannot-evaluate" : "pass",
      dis.active
        ? `Cannot evaluate — ${dis.reason ?? "disruption"} is shown in the prototype but not captured in any system today (hole); no rule can fire on it`
        : "No disruption on record (and not reliably captured in any system today)",
      [inputFrom("disruption", n.disruption, dis.active ? (dis.reason ?? "active") : "none")],
      undefined, // never gates — a hole cannot set eligibility state
    );
  }

  // 14 — Unresolved critical-field source conflict → NeedsCheck (KB: sources
  // conflict on a blocking-relevant field ⇒ NeedsCheck).
  {
    const conflicted = !!n.pes.conflict || !!n.clearanceG50.conflict;
    push(
      "R6-critical",
      "No unresolved critical-field conflict",
      conflicted ? "needs-check" : "pass",
      conflicted
        ? "Needs check — a critical field (PES / clearance) has an unresolved source conflict"
        : "Critical fields resolved",
      [inputFrom("pes", n.pes), inputFrom("clearanceG50", n.clearanceG50)],
      conflicted ? { status: "NeedsCheck", reason: "Unresolved critical-field conflict" } : undefined,
    );
  }

  // Blocks win over NeedsCheck regardless of order (KB: first blocking rule
  // sets the state); NeedsCheck applies only when no block fired.
  const state: EligibilityResult["state"] = blockState ?? needsState ?? { status: "Eligible" };
  const decidedBy = blockState ? blockBy : needsState ? needsBy : undefined;
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
