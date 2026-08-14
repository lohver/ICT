// ============================================================
// Domain constants — grounded rule parameters.
// Distributions/values are illustrative demo texture (spec §0).
// ============================================================

/** Fixed "as of now" anchor so freshness is deterministic and demo-stable.
 *  Matches the prototype's operating date. */
export const NOW = "2026-08-12";

/** PES fitness ordering (lower index = fitter). Grounded taxonomy. */
export const PES_ORDER = ["A", "B1", "B2", "B3", "C2", "C9"] as const;
export type PesGrade = (typeof PES_ORDER)[number];

export function pesRank(pes: string): number {
  const i = PES_ORDER.indexOf(pes as PesGrade);
  return i === -1 ? PES_ORDER.length : i;
}

/** Role → deployment requirement. minPES is the least-fit PES acceptable.
 *  requiresLicence marks vocations where a valid licence is hard-required. */
export interface VocationReq {
  minPES: PesGrade;
  requiresLicence?: boolean;
}

export const VOCATIONS: Record<string, VocationReq> = {
  Rifleman: { minPES: "B1" },
  Signaller: { minPES: "B2" },
  Medic: { minPES: "B2" },
  Storeman: { minPES: "C2" },
  Gunner: { minPES: "B1" },
  Mortarman: { minPES: "B1" },
  Driver: { minPES: "B2", requiresLicence: true },
  Clerk: { minPES: "C2" },
};

export const VOCATION_NAMES = Object.keys(VOCATIONS);

export const SUB_UNITS = ["Alpha Coy", "Bravo Coy", "Charlie Coy"] as const;

/** The roll's unit — an (illustrative) NS infantry battalion under 6 DIV, so
 *  the validating 6 Div S8s relate to the formation. Sub-units stay companies
 *  (Alpha/Bravo/Charlie Coy). The specific battalion designation is illustrative. */
export const UNIT_NAME = "6 DIV · NS Bn";

/** Freshness thresholds (days). Volatile fields go stale fast; the gap
 *  domains carry a longer currency window. Spec §6 field-level currency. */
export const FRESHNESS_DAYS: Record<string, number> = {
  // volatile
  disruption: 7,
  defermentStatus: 7,
  medical: 7,
  ipptStatus: 30,
  // gap / currency domains
  sar21Currency: 90,
  clearanceG50: 90,
  licence: 90,
  // slow-moving
  pes: 180,
  vocation: 365,
  appointmentHeld: 365,
  atmsTrainingReqMet: 60,
  // OASIS ICT-Management sets
  callUpDeviation: 30,
  typeOfService: 90,
  callUpNR: 120,
  tenure: 180,
  offences: 30,
  travelHistory: 14,
  ippt: 30,
  medicalHistory: 14,
  attendance: 30,
  trainingStatus: 90,
  attachment: 90,
  ihl: 120,
};

export const DEFAULT_FRESHNESS_DAYS = 90;

/** Fields whose staleness/conflict is "critical" for eligibility resolution. */
export const CRITICAL_FIELDS = new Set(["pes", "clearanceG50", "defermentStatus"]);

/** Human labels for fields, used in provenance + reason traces. */
export const FIELD_LABELS: Record<string, string> = {
  vocation: "Vocation",
  pes: "PES",
  appointmentHeld: "Appointment held",
  ipptStatus: "IPPT",
  medical: "Medical",
  defermentStatus: "Deferment",
  sar21Currency: "SAR-21 currency",
  clearanceG50: "Clearance (G50)",
  licence: "Licence",
  atmsTrainingReqMet: "ATMS training req",
  disruption: "Disruption / newborn (WOG)",
  tenure: "Tenure / liability",
  // OASIS ICT-Management sets
  callUpDeviation: "Call-Up Deviation",
  typeOfService: "Type of Service (TOS)",
  callUpNR: "Call-up NR validity",
  offences: "Offences",
  travelHistory: "Travel History",
  ippt: "IPPT (detail)",
  medicalHistory: "Medical history",
  attendance: "Attendance / parade state",
  trainingStatus: "Training status",
  attachment: "Attachment",
  ihl: "IHL / studying",
};

/** Provenance per field — see KB "Eligibility data-source mapping".
 *  Fixes the overclaim: G50/SAR-21 are NOT OASIS-ICT (gap); deferment
 *  is myDeferment/CICM, not OASIS. */
export const FIELD_PROVENANCE: Record<string, import("./types").Provenance> = {
  vocation: "confirmed",
  pes: "confirmed",
  appointmentHeld: "confirmed",
  ipptStatus: "confirmed",
  medical: "confirmed",
  defermentStatus: "confirmed",
  callUpDeviation: "confirmed",
  typeOfService: "confirmed",
  callUpNR: "confirmed",
  tenure: "confirmed",
  offences: "confirmed",
  travelHistory: "confirmed",
  ippt: "confirmed",
  medicalHistory: "confirmed",
  attendance: "confirmed",
  trainingStatus: "confirmed",
  attachment: "confirmed",
  // gap — aspirational, not a live feed; not from OneOASIS
  ihl: "gap",
  sar21Currency: "gap",
  clearanceG50: "gap",
  licence: "gap",
  atmsTrainingReqMet: "gap",
  // hole — not reliably captured in any system today (data-creation gap)
  disruption: "hole",
};

/** Source (feed) per field. Honest labels — some are not clean feeds. */
export const FIELD_SOURCES: Record<string, import("./types").SourceSystem> = {
  vocation: "eHR",
  pes: "eHR", // system-of-record eHR/OneOASIS; surfaced (not sourced) in Comd WB @ INET
  appointmentHeld: "eHR",
  ipptStatus: "OneOASIS",
  medical: "CommWB",
  defermentStatus: "myDeferment/CICM",
  callUpDeviation: "OneOASIS",
  typeOfService: "OneOASIS",
  callUpNR: "OneOASIS", // OASIS Nominal Roll @ OSN
  tenure: "eHR", // eHR / OneOASIS org data
  offences: "OneOASIS",
  travelHistory: "OneOASIS",
  ippt: "OneOASIS",
  medicalHistory: "OneOASIS",
  attendance: "OneOASIS",
  trainingStatus: "OneOASIS",
  attachment: "OneOASIS",
  ihl: "Manual YoT CSV",
  disruption: "Unidentified", // captured nowhere today — no owning system (hole)
  sar21Currency: "ATMS",
  clearanceG50: "Unidentified",
  licence: "Unidentified", // source system not stated in the corpus (per KB mapping)
  atmsTrainingReqMet: "ATMS",
};

/** Shown on every gap field so mocked data is never mistaken for a feed. */
export const ASPIRATIONAL_NOTE =
  "Aspirational — not a live feed; not from OneOASIS.";
/** Shown on hole fields — the data is not captured anywhere today. */
export const HOLE_NOTE =
  "Not captured in any system today — a data-creation gap, not just integration.";
export const ILLUSTRATIVE_NOTE = "Illustrative — not authoritative.";

/** Minimum service before an ICT (the "6-month" rule). UNVERIFIED per the KB
 *  "Eligibility data-source mapping" — the threshold's existence is asserted
 *  but its exact value is not confirmed, so the engine routes a shortfall to
 *  NeedsCheck (human confirmation) rather than a hard Block. */
export const MIN_SERVICE_MONTHS_UNVERIFIED = 6;

/** Default ICT window the roll is built against (illustrative dates).
 *  This only SEEDS the runtime window in the store; the engine evaluates
 *  against whatever window the commander sets, not this constant. */
export const ICT_WINDOW_DEFAULT: import("./types").IctWindow = {
  startDate: "2026-09-05",
  endDate: "2026-09-18",
};

/** Illustrative Type-of-Service codes. Only "ORNS-liable" is liable for ICT.
 *  Exhaustive TOS taxonomy is NOT known to us — this is a small demo set. */
export const TOS_CODES = [
  "ORNS-liable",
  "MINDEF/Other-Uniformed",
  "SPF/SCDF-transfer",
  "Discharged",
  "Deferred-service",
] as const;
export const TOS_LIABLE = new Set<string>(["ORNS-liable"]);

/** Illustrative Call-Up Deviation reasons. The exhaustive list lives in
 *  OASIS screenshots we haven't transcribed — this is a small demo set. */
export const CALL_UP_DEVIATION_REASONS: { code: string; label: string }[] = [
  { code: "DEV-EO", label: "Essential occupation / manpower critical" },
  { code: "DEV-CPS", label: "Compassionate grounds" },
  { code: "DEV-EXAM", label: "Examination / course clash" },
  { code: "DEV-KEYAPPT", label: "Key civilian appointment" },
  { code: "DEV-ADMIN", label: "Administrative hold" },
];

/** Illustrative offence types. Not an authoritative disciplinary taxonomy. */
export const OFFENCE_TYPES = [
  "AWOL",
  "Late reporting",
  "Insubordination",
  "Pending investigation",
] as const;

/** Target strength a commander plans an ICT roll against (demo). */
export const ICT_TARGET_STRENGTH = 90;
