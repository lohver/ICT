// ============================================================
// Domain types — Readiness Orchestration Layer (v0)
// ------------------------------------------------------------
// Schema is grounded & cited per CLAUDE.md / README §0 (data
// discipline). Field list for the OASIS ICT-Management extension
// is transcribed from the prompt spec; every CONCRETE value set
// (deviation reasons, TOS codes, offence types) is ILLUSTRATIVE
// and tagged as such in code + UI — not authoritative.
// ============================================================

/** Source systems / feeds the orchestration layer references.
 *  Honest labels: some "sources" are not clean feeds (see provenance). */
export type SourceSystem =
  | "eHR"
  | "OneOASIS"
  | "ATMS"
  | "CommWB"
  | "NSSC"
  | "myDeferment/CICM" // deferment system-of-record — NOT OASIS-ICT
  | "Manual YoT CSV" // IHL batch — manual, not a clean feed
  | "Unidentified"; // e.g. G50 clearance module not yet identified

/** The ICT activity window the roll is resolved against (v0: single window).
 *  Per-phase dates (each ICT phase with its own date) are a later extension. */
export interface IctWindow {
  startDate: string; // ISO date
  endDate: string; // ISO date
}

/** Provenance per the KB "Eligibility data-source mapping" page.
 *  confirmed — evidenced in a real system doc (OASIS ICT-Mgmt v1.1,
 *              Comd WB v0.6, playbooks).
 *  gap       — exists in a source system but not in any aggregation
 *              layer we have a spec for; mocked / aspirational.
 *  hole      — often captured nowhere. */
export type Provenance = "confirmed" | "gap" | "hole";

/** A single source-provided field, wrapped so provenance (source +
 *  as-of + provenance tag) and conflicts can be rendered on demand. */
export interface Field<T> {
  value: T;
  source: SourceSystem;
  asOf: string; // ISO date; some deliberately stale
  provenance: Provenance;
  /** Present when sources disagreed and one was taken by precedence. */
  conflict?: {
    takenFrom: SourceSystem;
    precedence: string; // the precedence rule applied
    alsoSeen: { source: SourceSystem; value: string }[];
  };
}

// ------------------------------------------------------------
// OASIS ICT-Management data sets (extension). Concrete value sets
// live in constants.ts and are tagged illustrative.
// ------------------------------------------------------------

/** Call-Up Deviation — OASIS block mechanism. A non-empty array
 *  means the man is Blocked; the reasonLabel is surfaced verbatim. */
export interface CallUpDeviation {
  reasonCode: string;
  reasonLabel: string;
  illustrative: true;
}

/** Type-of-Service. A current non-liable TOS, or a future-dated TOS
 *  whose window overlaps the ICT, changes eligibility. */
export type TOSCode = string; // illustrative set in constants
export interface FutureDatedTOS {
  tosCode: TOSCode;
  startDate: string;
  endDate: string;
}
export interface TypeOfService {
  current: TOSCode;
  futureDated: FutureDatedTOS[];
}

export interface Offence {
  offenceType: string; // illustrative
  date: string;
  status: "open" | "closed";
  illustrative: true;
}
export interface OffenceRecord {
  current: Offence[];
  past: Offence[];
  /** Derived from attendance history (any AWOL parade-state outcome). */
  awol: boolean;
}

export interface ExitPermit {
  start: string;
  end: string;
}
export interface BorderMovement {
  date: string;
  direction: "out" | "in";
  illustrative: true;
}
export interface TravelHistory {
  exitPermits: ExitPermit[];
  borderMovements: BorderMovement[];
}

export type IpptWindowStatus =
  | "Pass"
  | "Fail"
  | "Not Attempted"
  | "FIT (Non-Mandatory)"
  | "Exempt";
/** Expanded IPPT record. Field names mirror OASIS; values illustrative. */
export interface IpptDetail {
  eligibilityCriteria: string;
  nsFit: boolean;
  hsp: boolean;
  iptRt: "None" | "IPT" | "RT";
  stationExcuses: string[];
  currentWindow: IpptWindowStatus;
  pastWindow: IpptWindowStatus;
}

export interface MedicalEntry {
  date: string;
  duration: string;
  excuse: string;
  excuseType: string; // illustrative
  remarks: string;
}

/** Parade-state outcome per past activity. */
export type AttendanceOutcome =
  | "ReportLate"
  | "MC"
  | "FailedInPro"
  | "DeferredOutPro"
  | "AWOL"
  | "NoPayLeave"
  | "ChangeInTrainingPeriod";
export interface AttendanceRecord {
  activityId: string;
  activityLabel: string;
  outcome: AttendanceOutcome;
  date: string;
}

export interface TrainingStatus {
  mutRequired: boolean;
  refresherFor: string | null; // activityId
}

export type AttachmentType = "organic" | "attached-in" | "detached-out";
export interface Attachment {
  type: AttachmentType;
  homeUnit: string;
  receivingUnit: string;
}

/** Study non-availability (IHL). provenance gap — manual CSV batch.
 *  Covers both local in-house learning and overseas study. */
export interface IHL {
  studying: boolean;
  overseas?: boolean;
  institution?: string;
  expectedEnd?: string;
}

/** Disruption / newborn / other WOG non-availability.
 *  provenance HOLE — "not highlighted in system as no logic is designed";
 *  captured nowhere today, so this is a data-CREATION gap, not integration. */
export type DisruptionReason = "Disruption" | "Newborn" | "Other WOG reason";
export interface Disruption {
  active: boolean;
  reason?: DisruptionReason;
  illustrative: true;
}

/** Call-up Nominal-Roll validity fields (OASIS NR). A recorded phase date
 *  materially older than the ICT window, or an NR not reviewed against the
 *  current window, needs a human check before the roll is trusted. */
export interface CallUpNR {
  phaseDate: string; // ISO date the call-up NR was cut for
  dateReviewed: string; // ISO date the NR was last reviewed
}

/** Tenure / service-liability. ORNS years, HK points clocked and MUT count
 *  are grounded ORNS concepts; `minServiceMet` is the derived gate. The exact
 *  minimum-service threshold (the "6-month" rule) is UNVERIFIED (see KB), so
 *  the engine routes a shortfall to NeedsCheck rather than a hard Block. */
export interface Tenure {
  ornsYears: number;
  hkClocked: number;
  mut: number;
  minServiceMet: boolean;
}

// ------------------------------------------------------------
// Block / eligibility reasons. Blocked.reason is a free string so
// a Call-Up Deviation label can be surfaced verbatim (OASIS terms).
// ------------------------------------------------------------
export type BlockReason =
  | "IHL / studying"
  | "Disruption / newborn (WOG)"
  | "Overseas — exit permit"
  | "Down-PES / medical"
  | "Clearance / licence expired"
  | "TOS — non-liable"
  | "Call-up deviation"
  | "Deferment";

export type EligibilityStatus = "Eligible" | "Blocked" | "NeedsCheck";

export type EligibilityState =
  | { status: "Eligible" }
  | { status: "Blocked"; reason: string; code?: string; detail?: string; until?: string }
  | { status: "NeedsCheck"; reason: string };

// ------------------------------------------------------------
// Explainability — the reason trace the engine returns per NSman.
// ------------------------------------------------------------
/** "cannot-evaluate" — the dataset is a HOLE (captured nowhere today), so the
 *  engine deliberately refuses to gate on it; the row is informational only. */
export type RuleResult = "pass" | "block" | "needs-check" | "skipped" | "cannot-evaluate";

export interface RuleInput {
  label: string;
  value: string;
  source?: SourceSystem;
  asOf?: string;
  stale?: boolean;
  provenance?: Provenance;
}

export interface RuleEval {
  id: string;
  label: string;
  result: RuleResult;
  detail: string;
  inputs: RuleInput[];
}

export interface EligibilityResult {
  state: EligibilityState;
  decidedBy?: string;
  trace: RuleEval[];
}

// ------------------------------------------------------------
// AI advisory layer — separated from the deterministic decision
// layer. Every AI output is a labelled suggestion; never gates.
// ------------------------------------------------------------
export interface AdvisorySignal {
  anomaly?: string;
}

// ------------------------------------------------------------
// Core entity. Fields are wrapped so provenance renders on demand.
// Raw JSON stores everything EXCEPT the derived eligibility.
// ------------------------------------------------------------
export interface NSmanSource {
  id: string;
  // identity / org
  rank: string;
  name: string;
  nric: string; // masked, e.g. "S****123A"
  unit: string;
  subUnit: string;
  serviceType: string;
  firstYearHK: number;
  ornsYears: number;
  hkClocked: number;
  mut: number;
  // deployment [confirmed]
  vocation: Field<string>;
  pes: Field<string>; // PES → Comd WB / eHR (NOT OASIS-ICT)
  appointmentHeld: Field<string>;
  // readiness [confirmed]
  ipptStatus: Field<"Pass" | "Fail" | "Not Attempted" | "FIT (Non-Mandatory)">; // roll-chip summary
  medical: Field<string>; // summary status; full history in medicalHistory
  defermentStatus: Field<"None" | "Applied" | "Approved" | "Rejected">; // myDeferment/CICM

  // ---- OASIS ICT-Management data sets [confirmed unless noted] ----
  callUpDeviation: Field<CallUpDeviation[]>;
  typeOfService: Field<TypeOfService>;
  callUpNR: Field<CallUpNR>; // NR phase date / date reviewed [confirmed]
  tenure: Field<Tenure>; // ORNS/HK/MUT liability [confirmed; 6-mo threshold unverified]
  offences: Field<OffenceRecord>;
  travelHistory: Field<TravelHistory>;
  ippt: Field<IpptDetail>;
  medicalHistory: Field<MedicalEntry[]>;
  attendance: Field<AttendanceRecord[]>;
  trainingStatus: Field<TrainingStatus>;
  attachment: Field<Attachment>;
  ihl: Field<IHL>; // provenance gap — manual YoT CSV (incl. overseas study)
  disruption: Field<Disruption>; // provenance hole — captured nowhere today

  // ---- gap domains — aspirational, not a live feed; not from OneOASIS ----
  sar21Currency: Field<"Current" | "Expiring" | "Expired">; // ATMS (marksmanship) — gap
  clearanceG50: Field<"Cleared" | "Pending" | "Expired">; // module unidentified — gap
  licence: Field<"Valid" | "Expired" | "NA">; // gap
  atmsTrainingReqMet: Field<boolean>; // gap
}

/** Source record enriched with derived orchestration output. */
export interface NSman extends NSmanSource {
  eligibility: EligibilityState;
  eligibilityTrace: EligibilityResult;
  advisory: AdvisorySignal;
}
