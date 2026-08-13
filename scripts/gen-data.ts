// ============================================================
// Synthetic dataset generator — OASIS ICT-Management extension.
// Schema/enums are grounded (CLAUDE.md / README §0). VALUES +
// distributions below are ILLUSTRATIVE demo texture only — never
// real, and never a measured percentage. Deterministic (seeded).
//
//   npm run gen:data   →  writes src/data/nsmen.json
// ============================================================
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CALL_UP_DEVIATION_REASONS,
  FIELD_PROVENANCE,
  FIELD_SOURCES,
  ICT_WINDOW_DEFAULT,
  NOW,
  OFFENCE_TYPES,
  SUB_UNITS,
  UNIT_NAME,
  VOCATIONS,
  type PesGrade,
} from "../src/domain/constants.ts";
import { enrich } from "../src/domain/engine.ts";
import type {
  AttendanceOutcome,
  AttendanceRecord,
  CallUpDeviation,
  Field,
  IpptDetail,
  MedicalEntry,
  NSmanSource,
} from "../src/domain/types.ts";

// ---------- seeded PRNG (mulberry32) ----------
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20260812);
const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rand() * arr.length)];
const chance = (p: number) => rand() < p;
function weighted<T>(items: [T, number][]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [v, w] of items) {
    if ((r -= w) < 0) return v;
  }
  return items[items.length - 1][0];
}

// ---------- date helpers (relative to NOW / the ICT window) ----------
const NOW_MS = new Date(NOW).getTime();
function daysAgoISO(days: number): string {
  return new Date(NOW_MS - days * 86_400_000).toISOString().slice(0, 10);
}
const freshDate = () => daysAgoISO(1 + Math.floor(rand() * 4));
/** A date inside the ICT window (used for overlapping edge cases). */
const inWindow = ICT_WINDOW_DEFAULT.startDate;
/** An exit-permit range that spans the default ICT window. */
const permitSpanning = { start: daysBeforeWindow(4), end: daysAfterWindowStart(6) };
/** An exit-permit that ends JUST BEFORE the default window — flips to Blocked
 *  when the commander shifts the window earlier ("what-if the dates move"). */
const permitJustBefore = { start: daysBeforeWindow(9), end: daysBeforeWindow(2) };
function daysBeforeWindow(d: number): string {
  return new Date(new Date(ICT_WINDOW_DEFAULT.startDate).getTime() - d * 86_400_000).toISOString().slice(0, 10);
}
function daysAfterWindowStart(d: number): string {
  return new Date(new Date(ICT_WINDOW_DEFAULT.startDate).getTime() + d * 86_400_000).toISOString().slice(0, 10);
}

// ---------- synthetic identity (fake) ----------
const CH_SURNAME = ["Tan", "Lim", "Ng", "Ong", "Goh", "Chua", "Sim", "Teo", "Low", "Yeo", "Koh", "Toh", "Ang", "Chin", "Foo", "Wong", "Lee", "Chan", "Ho", "Neo", "Seah", "Quek"];
const CH_GIVEN = ["Wei Ming", "Jun Jie", "Kok Wah", "Zhi Hao", "Yong Sheng", "Kai Boon", "Wei Liang", "Jia Hui", "Chee Keong", "Ming Hui", "Wen Xuan", "Jun Hao", "Shao Wei", "Kah Hui", "Zheng Yang", "Yi Xiang", "Ren Hao", "Wei Jie", "Kok Meng", "Jia Le"];
const MY_GIVEN = ["Hafiz", "Iskandar", "Faizal", "Amirul", "Rizwan", "Syafiq", "Danial", "Hakim", "Fandi", "Ridhwan", "Azhar", "Shahril"];
const MY_FATHER = ["Rahman", "Yusof", "Osman", "Salleh", "Kamarul", "Ahmad", "Zulkifli", "Hamzah", "Ismail", "Bakar"];
const IN_GIVEN = ["Kumar", "Arun", "Prakash", "Vignesh", "Harish", "Dinesh", "Naveen", "Sanjay", "Ravi", "Karthik"];
const IN_FATHER = ["Rajendran", "Muthu", "Devan", "Ramesh", "Balan", "Suppiah", "Chandran", "Nathan", "Segaran"];
function makeName(): string {
  const race = weighted<"ch" | "my" | "in">([["ch", 6], ["my", 3], ["in", 2]]);
  if (race === "ch") return `${pick(CH_SURNAME)} ${pick(CH_GIVEN)}`;
  if (race === "my") return `${pick(MY_GIVEN)} bin ${pick(MY_FATHER)}`;
  return `${pick(IN_GIVEN)} s/o ${pick(IN_FATHER)}`;
}
function makeNRIC(): string {
  const d = () => Math.floor(rand() * 10);
  const letter = pick("ABCDEFGHIZJ".split(""));
  return `S****${d()}${d()}${d()}${letter}`;
}

const RANKS = [
  ["REC", 4], ["PTE", 10], ["LCP", 14], ["CPL", 16], ["CFC", 8],
  ["3SG", 8], ["2SG", 6], ["1SG", 3], ["SSG", 2],
  ["3WO", 1], ["2LT", 2], ["LTA", 3], ["CPT", 2],
] as const;

const APPOINTMENTS = [
  "Rifleman", "Section 2IC", "Section Commander", "Platoon Sergeant",
  "Platoon Commander", "Signals Detachment", "Company Medic", "Store IC",
  "Gun Detachment", "Mortar Line", "Driver / MT Line", "Company Clerk",
];

const OTHER_UNITS = ["1 SIR", "2 SIR", "4 SIR", "5 SIR", "6 SIR"];

function field<T>(key: string, value: T, asOf: string): Field<T> {
  return {
    value,
    source: FIELD_SOURCES[key] ?? "eHR",
    asOf,
    provenance: FIELD_PROVENANCE[key] ?? "confirmed",
  };
}

// ============================================================
// Cause-driven generation. Each record is assigned a specific
// CAUSE; source fields are set so the engine derives the intended
// state honestly (the engine is the source of truth).
// ============================================================
type Cause =
  | "clean"
  | "dev"
  | "tos"
  | "overseas"
  | "overseas-edge"
  | "pes"
  | "deferment"
  | "avail-ihl"
  | "avail-disruption"
  | "avail-overseas-study"
  | "avail-callup6mo"
  | "licence-hard"
  | "clearance"
  | "offence"
  | "medical";

const PES_ORDER_LOCAL: PesGrade[] = ["A", "B1", "B2", "B3", "C2", "C9"];
const rankOf = (p: PesGrade) => PES_ORDER_LOCAL.indexOf(p);
function pesForVocation(voc: string, healthy: boolean): PesGrade {
  const min = VOCATIONS[voc].minPES;
  if (!healthy) {
    const below: PesGrade[] = ["B2", "C2", "C9"];
    const worse = below.filter((p) => rankOf(p) > rankOf(min));
    return worse.length ? pick(worse) : "C9";
  }
  const options: [PesGrade, number][] = [["A", 5], ["B1", 4], ["B2", 2]];
  const filtered = options.filter(([p]) => rankOf(p) <= rankOf(min));
  return weighted(filtered.length ? filtered : [["A", 1]]);
}

// ---------- new-field generators ----------
function makeIppt(clean: boolean, ipptStatus: string): Field<IpptDetail> {
  const currentWindow: IpptDetail["currentWindow"] = clean
    ? (ipptStatus === "FIT (Non-Mandatory)" ? "FIT (Non-Mandatory)" : ipptStatus === "Not Attempted" ? "Not Attempted" : "Pass")
    : "Fail";
  const detail: IpptDetail = {
    eligibilityCriteria: "Age-band standard (illustrative)",
    nsFit: clean ? chance(0.85) : chance(0.3),
    hsp: chance(0.7),
    iptRt: clean ? "None" : weighted([["IPT", 3], ["RT", 2], ["None", 1]]),
    stationExcuses: clean ? [] : weighted([[["Running excused"], 3], [["Standing broad jump excused"], 2], [[], 1]]),
    currentWindow,
    pastWindow: weighted([["Pass", 5], ["Fail", 2], ["Not Attempted", 2]]),
  };
  return field("ippt", detail, daysAgoISO(2 + Math.floor(rand() * 25)));
}

function makeMedicalHistory(activeInWindow: boolean, summary: string): Field<MedicalEntry[]> {
  const entries: MedicalEntry[] = [];
  const n = activeInWindow ? 1 + Math.floor(rand() * 2) : Math.floor(rand() * 2);
  for (let i = 0; i < n; i++) {
    entries.push({
      date: daysAgoISO(30 + Math.floor(rand() * 300)),
      duration: pick(["3 days", "1 week", "2 weeks", "5 days"]),
      excuse: pick(["Excuse RMJ", "Light duties", "Excuse PT/Games", "Attend C"]),
      excuseType: pick(["MC", "Physio", "Specialist review", "Dental"]),
      remarks: summary === "None" ? "Routine" : summary,
    });
  }
  if (activeInWindow) {
    // an excuse dated inside the ICT window → R-medical fires
    entries.unshift({
      date: inWindow,
      duration: "2 weeks",
      excuse: "Excuse RMJ",
      excuseType: "MC",
      remarks: "Active over the ICT window",
    });
  }
  return field("medicalHistory", entries, freshDate());
}

function makeAttendance(awol: boolean): Field<AttendanceRecord[]> {
  const cycles = ["ICT 2024", "ICT 2023", "ICT 2022"];
  const recs: AttendanceRecord[] = [];
  for (let i = 0; i < cycles.length; i++) {
    const outcome: AttendanceOutcome =
      awol && i === 0
        ? "AWOL"
        : weighted<AttendanceOutcome>([
            ["ReportLate", 2],
            ["MC", 2],
            ["DeferredOutPro", 1],
            ["NoPayLeave", 1],
            ["ChangeInTrainingPeriod", 1],
            ["FailedInPro", 1],
          ]);
    recs.push({
      activityId: `ACT-${cycles[i].replace(/\s/g, "")}`,
      activityLabel: cycles[i],
      outcome,
      date: daysAgoISO(200 + i * 360),
    });
  }
  return field("attendance", recs, daysAgoISO(10 + Math.floor(rand() * 40)));
}

function makeRecord(idx: number, subUnit: string, cause: Cause): NSmanSource {
  const rank = weighted(RANKS.map(([r, w]) => [r as string, w] as [string, number]));
  const vocation = weighted<string>([
    ["Rifleman", 32], ["Signaller", 12], ["Medic", 9], ["Storeman", 8],
    ["Gunner", 9], ["Mortarman", 8], ["Driver", 12], ["Clerk", 10],
  ]);

  // clean defaults
  let pes: PesGrade = pesForVocation(vocation, true);
  let availability: NSmanSource["availability"]["value"] = "Available";
  let deferment: NSmanSource["defermentStatus"]["value"] = weighted([["None", 88], ["Rejected", 6], ["Applied", 6]]);
  let clearance: NSmanSource["clearanceG50"]["value"] = weighted([["Cleared", 90], ["Pending", 6], ["Expired", 4]]);
  let licence: NSmanSource["licence"]["value"] =
    vocation === "Driver" ? weighted([["Valid", 90], ["Expired", 10]]) : weighted([["NA", 80], ["Valid", 18], ["Expired", 2]]);

  // new-field defaults (clean)
  let deviations: CallUpDeviation[] = [];
  let tosCurrent = "ORNS-liable";
  let futureTOS: NSmanSource["typeOfService"]["value"]["futureDated"] = [];
  let exitPermits: NSmanSource["travelHistory"]["value"]["exitPermits"] = [];
  let offenceOpen = false;
  let awol = false;
  let medicalActive = false;

  // clean records must NOT trip any soft rule
  clearance = "Cleared";

  switch (cause) {
    case "dev": {
      const r = pick(CALL_UP_DEVIATION_REASONS);
      deviations = [{ reasonCode: r.code, reasonLabel: r.label, illustrative: true }];
      break;
    }
    case "tos":
      tosCurrent = weighted([["Discharged", 3], ["SPF/SCDF-transfer", 2], ["MINDEF/Other-Uniformed", 2], ["Deferred-service", 1]]);
      break;
    case "overseas":
      exitPermits = [permitSpanning];
      break;
    case "overseas-edge":
      // Just OUTSIDE the default window — eligible now, but flips to Blocked
      // if the window shifts earlier. Demonstrates the "what-if dates" recompute.
      exitPermits = [permitJustBefore];
      break;
    case "pes":
      pes = pesForVocation(vocation, false);
      break;
    case "deferment":
      deferment = "Approved";
      break;
    case "avail-ihl":
      availability = "IHL / studying";
      break;
    case "avail-disruption":
      availability = "Disruption";
      break;
    case "avail-overseas-study":
      availability = "Overseas study";
      break;
    case "avail-callup6mo":
      availability = "Call-up < 6 months before ICT";
      break;
    case "licence-hard":
      // force a Driver with expired licence
      licence = "Expired";
      break;
    case "clearance":
      clearance = weighted([["Expired", 3], ["Pending", 2]]);
      break;
    case "offence":
      offenceOpen = true;
      awol = chance(0.4);
      break;
    case "medical":
      medicalActive = true;
      break;
    case "clean":
    default:
      break;
  }

  const vocationFinal = cause === "licence-hard" ? "Driver" : vocation;
  if (cause === "licence-hard") pes = pesForVocation("Driver", true);

  const ipptStatus = medicalActive
    ? "Fail"
    : weighted<NSmanSource["ipptStatus"]["value"]>([["Pass", 60], ["FIT (Non-Mandatory)", 16], ["Not Attempted", 24]]);
  const medicalSummary = medicalActive
    ? "Light duties (2 wks)"
    : weighted<string>([["None", 84], ["Light duties (2 wks)", 8], ["MC — 3 days", 5], ["Reviewing", 3]]);
  const sar21 = weighted<NSmanSource["sar21Currency"]["value"]>([["Current", 74], ["Expiring", 16], ["Expired", 10]]);
  const atmsMet = chance(0.82);

  // some clean records carry a (non-overlapping) future-dated TOS as texture
  if (cause === "clean" && chance(0.08)) {
    futureTOS = [{ tosCode: "Deferred-service", startDate: daysAgoISO(-400), endDate: daysAgoISO(-360) }];
  }
  // a few clean records carry a past (non-overlapping) exit permit
  if (cause === "clean" && chance(0.12)) {
    exitPermits = [{ start: daysAgoISO(120), end: daysAgoISO(90) }];
  }

  // attachment: ~15% attached-in, ~5% detached-out, rest organic
  const attachmentType = weighted<NSmanSource["attachment"]["value"]["type"]>([
    ["organic", 80], ["attached-in", 15], ["detached-out", 5],
  ]);
  const attachment = {
    type: attachmentType,
    homeUnit: attachmentType === "attached-in" ? pick(OTHER_UNITS) : UNIT_NAME,
    receivingUnit: attachmentType === "detached-out" ? pick(OTHER_UNITS) : UNIT_NAME,
  };

  const offences = {
    current: offenceOpen ? [{ offenceType: pick(OFFENCE_TYPES), date: daysAgoISO(20 + Math.floor(rand() * 40)), status: "open" as const, illustrative: true as const }] : [],
    past: chance(0.2) ? [{ offenceType: pick(OFFENCE_TYPES), date: daysAgoISO(400 + Math.floor(rand() * 400)), status: "closed" as const, illustrative: true as const }] : [],
    awol,
  };

  const ornsYears = 1 + Math.floor(rand() * 10);
  const firstYearHK = 2016 + Math.floor(rand() * 9);

  const rec: NSmanSource = {
    id: `NS-${String(idx).padStart(3, "0")}`,
    rank,
    name: makeName(),
    nric: makeNRIC(),
    unit: UNIT_NAME,
    subUnit,
    serviceType: "Operationally-Ready NSman",
    firstYearHK,
    ornsYears,
    hkClocked: Math.floor(rand() * 70),
    mut: 1 + Math.floor(rand() * 3),
    vocation: field("vocation", vocationFinal, daysAgoISO(30 + Math.floor(rand() * 300))),
    pes: field("pes", pes, freshDate()),
    appointmentHeld: field("appointmentHeld", pick(APPOINTMENTS), daysAgoISO(20 + Math.floor(rand() * 200))),
    availability: field("availability", availability, freshDate()),
    ipptStatus: field("ipptStatus", ipptStatus, daysAgoISO(2 + Math.floor(rand() * 25))),
    medical: field("medical", medicalSummary, freshDate()),
    defermentStatus: field("defermentStatus", deferment, freshDate()),

    callUpDeviation: field("callUpDeviation", deviations, freshDate()),
    typeOfService: field("typeOfService", { current: tosCurrent, futureDated: futureTOS }, freshDate()),
    offences: field("offences", offences, freshDate()),
    travelHistory: field("travelHistory", {
      exitPermits,
      borderMovements: exitPermits.length
        ? [{ date: exitPermits[0].start, direction: "out" as const, illustrative: true as const }]
        : [],
    }, freshDate()),
    ippt: makeIppt(!medicalActive, ipptStatus),
    medicalHistory: makeMedicalHistory(medicalActive, medicalSummary),
    attendance: makeAttendance(awol),
    trainingStatus: field("trainingStatus", {
      mutRequired: chance(0.15),
      refresherFor: chance(0.1) ? "ACT-ICT2023" : null,
    }, freshDate()),
    attachment: field("attachment", attachment, daysAgoISO(10 + Math.floor(rand() * 60))),
    ihl: field("ihl", availability === "IHL / studying"
      ? { studying: true, institution: pick(["NUS", "NTU", "SMU", "SIT", "SUSS"]), expectedEnd: daysAgoISO(-200) }
      : { studying: false }, daysAgoISO(20 + Math.floor(rand() * 100))),

    sar21Currency: field("sar21Currency", sar21, daysAgoISO(5 + Math.floor(rand() * 80))),
    clearanceG50: field("clearanceG50", clearance, daysAgoISO(5 + Math.floor(rand() * 80))),
    licence: field("licence", licence, daysAgoISO(5 + Math.floor(rand() * 80))),
    atmsTrainingReqMet: field("atmsTrainingReqMet", atmsMet, daysAgoISO(3 + Math.floor(rand() * 50))),
  };

  return rec;
}

// ---------- freshness + conflict texture ----------
const VOLATILE_STALE_KEYS = ["availability", "defermentStatus", "medical", "ipptStatus"] as const;
const CURRENCY_STALE_KEYS = ["sar21Currency", "clearanceG50", "licence", "pes"] as const;

function makeStale(rec: NSmanSource) {
  const n = chance(0.5) ? 1 : 2;
  const keys = chance(0.5) ? VOLATILE_STALE_KEYS : CURRENCY_STALE_KEYS;
  for (let i = 0; i < n; i++) {
    const key = pick(keys);
    const bump = key === "pes" || key.startsWith("sar") || key === "clearanceG50" || key === "licence" ? 120 + Math.floor(rand() * 200) : 14 + Math.floor(rand() * 40);
    (rec[key] as Field<unknown>).asOf = daysAgoISO(bump);
  }
}

function makeConflict(rec: NSmanSource) {
  const key = pick(["pes", "vocation", "ipptStatus"] as const); // avoid clearance (gap) to prevent overclaim
  const f = rec[key] as Field<unknown>;
  const alt: Record<string, { from: NSmanSource["pes"]["source"]; other: NSmanSource["pes"]["source"]; otherVal: string; rule: string }> = {
    pes: { from: "eHR", other: "CommWB", otherVal: "B1", rule: "eHR is system-of-record for PES; Comd WB surfaces a lagging copy" },
    vocation: { from: "eHR", other: "OneOASIS", otherVal: "Rifleman", rule: "eHR is authoritative for vocation" },
    ipptStatus: { from: "OneOASIS", other: "ATMS", otherVal: "Not Attempted", rule: "OneOASIS holds the latest IPPT result" },
  };
  const a = alt[key];
  f.conflict = { takenFrom: a.from, precedence: a.rule, alsoSeen: [{ source: a.other, value: a.otherVal }] };
}

// ============================================================
// Build the unit — planted edge cases + clean fill.
// ============================================================
function build() {
  const TOTAL = 120;
  // guaranteed illustrative edge cases + clean fill (see prototype-spec.md §7)
  const plan: [Cause, number][] = [
    ["dev", 5],
    ["tos", 4],
    ["overseas", 4],
    ["overseas-edge", 4],
    ["pes", 3],
    ["deferment", 2],
    ["avail-ihl", 2],
    ["avail-disruption", 1],
    ["avail-overseas-study", 1],
    ["avail-callup6mo", 1],
    ["licence-hard", 1],
    ["clearance", 10],
    ["offence", 6],
    ["medical", 6],
  ];
  const causes: Cause[] = [];
  for (const [c, n] of plan) for (let i = 0; i < n; i++) causes.push(c);
  while (causes.length < TOTAL) causes.push("clean");

  // shuffle (seeded)
  for (let i = causes.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [causes[i], causes[j]] = [causes[j], causes[i]];
  }

  const records: NSmanSource[] = [];
  for (let i = 0; i < TOTAL; i++) {
    const subUnit = SUB_UNITS[i % SUB_UNITS.length];
    const rec = makeRecord(i + 1, subUnit, causes[i]);
    if (chance(0.16)) makeStale(rec);
    if (chance(0.06)) makeConflict(rec);
    records.push(rec);
  }
  return records;
}

// ---------- write + report ----------
const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, "../src/data/nsmen.json");
const records = build();
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, `${JSON.stringify(records, null, 2)}\n`);

const enriched = records.map((r) => enrich(r, ICT_WINDOW_DEFAULT));
const count = (pred: (r: ReturnType<typeof enrich>) => boolean) => enriched.filter(pred).length;
const pct = (n: number) => `${((n / enriched.length) * 100).toFixed(0)}%`;
console.log(`Wrote ${records.length} records → ${outPath}`);
console.log("Eligibility:",
  `Eligible ${count((r) => r.eligibility.status === "Eligible")} (${pct(count((r) => r.eligibility.status === "Eligible"))})`,
  `| NeedsCheck ${count((r) => r.eligibility.status === "NeedsCheck")} (${pct(count((r) => r.eligibility.status === "NeedsCheck"))})`,
  `| Blocked ${count((r) => r.eligibility.status === "Blocked")} (${pct(count((r) => r.eligibility.status === "Blocked"))})`,
);
console.log("Decided-by:",
  ["R0-deviation", "R-tos", "R-overseas", "R-offences", "R-medical"].map(
    (id) => `${id} ${count((r) => r.eligibilityTrace.decidedBy === id)}`,
  ).join(" | "),
);
console.log("Attachment:",
  `attached-in ${count((r) => r.attachment.value.type === "attached-in")}`,
  `| detached-out ${count((r) => r.attachment.value.type === "detached-out")}`,
);
// "What-if the dates move": how many flip when the window shifts ±1 week.
const shift = (days: number) => ({
  startDate: new Date(new Date(ICT_WINDOW_DEFAULT.startDate).getTime() + days * 86_400_000).toISOString().slice(0, 10),
  endDate: new Date(new Date(ICT_WINDOW_DEFAULT.endDate).getTime() + days * 86_400_000).toISOString().slice(0, 10),
});
for (const days of [-7, 7]) {
  const shifted = records.map((r) => enrich(r, shift(days)));
  const flips = shifted.filter((r, i) => r.eligibility.status !== enriched[i].eligibility.status).length;
  console.log(`Window ${days > 0 ? "+" : ""}${days}d: ${flips} eligibility flip(s)`);
}
