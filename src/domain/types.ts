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

/** Study non-availability (IHL). provenance gap — manual CSV batch. */
export interface IHL {
  studying: boolean;
  institution?: string;
  expectedEnd?: string;
}

// ------------------------------------------------------------
// Block / eligibility reasons. Blocked.reason is a free string so
// a Call-Up Deviation label can be surfaced verbatim (OASIS terms).
// ------------------------------------------------------------
export type BlockReason =
  | "IHL / studying"
  | "Disruption"
  | "Overseas study"
  | "Overseas — exit permit"
  | "Down-PES / medical"
  | "Call-up < 6 months before ICT"
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
export type RuleResult = "pass" | "block" | "needs-check" | "skipped";

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
  availability: Field<
    | "Available"
    | "IHL / studying"
    | "Disruption"
    | "Overseas study"
    | "Call-up < 6 months before ICT"
  >;
  // readiness [confirmed]
  ipptStatus: Field<"Pass" | "Fail" | "Not Attempted" | "FIT (Non-Mandatory)">; // roll-chip summary
  medical: Field<string>; // summary status; full history in medicalHistory
  defermentStatus: Field<"None" | "Applied" | "Approved" | "Rejected">; // myDeferment/CICM

  // ---- OASIS ICT-Management data sets [confirmed unless noted] ----
  callUpDeviation: Field<CallUpDeviation[]>;
  typeOfService: Field<TypeOfService>;
  offences: Field<OffenceRecord>;
  travelHistory: Field<TravelHistory>;
  ippt: Field<IpptDetail>;
  medicalHistory: Field<MedicalEntry[]>;
  attendance: Field<AttendanceRecord[]>;
  trainingStatus: Field<TrainingStatus>;
  attachment: Field<Attachment>;
  ihl: Field<IHL>; // provenance gap — manual YoT CSV

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
