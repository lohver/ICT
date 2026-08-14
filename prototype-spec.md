# ICTMS prototype — build spec (v0)

Clickable prototype of a **Readiness Orchestration Layer** (commander-facing) for building an
In-Camp Training (ICT) nominal roll. React + TypeScript + Vite + Tailwind v4. Synthetic data
only, in-memory, no backend, no real integrations.

> This file was reconstructed as the acceptance-#5 deliverable of the OASIS ICT-Management
> extension. The original `prototype-spec.md` was not present in the repo; the binding
> data-discipline rule (§0) is carried by [CLAUDE.md](CLAUDE.md) and the README.

## §0 Data discipline (binding)

- **Do not invent taxonomies or distributions.** Where concrete values are needed but the
  authoritative list is unknown (Call-Up Deviation reasons, TOS codes, offence types), use a
  **small illustrative set** and tag it `illustrative — not authoritative` in code + UI.
- **Never present a synthetic percentage as measured.** Distributions are demo texture.
- **Provenance on every field** (see §5). Mocked/aspirational fields must be visually distinct
  so they are never mistaken for a live feed.

## §5 Provenance model

Each `Field<T>` (`src/domain/types.ts`) carries `value`, `source`, `asOf`, `provenance`, and an
optional resolved `conflict`. Provenance tags (KB "Eligibility data-source mapping"):

| Tag | Meaning |
|-----|---------|
| `confirmed` | Evidenced in a real system doc (OASIS ICT-Mgmt v1.1, Comd WB v0.6, playbooks). |
| `gap` | Exists in a source system but no aggregation-layer spec — mocked / aspirational. |
| `hole` | Often captured nowhere. |

Per-field provenance + source live in `FIELD_PROVENANCE` / `FIELD_SOURCES`
(`src/domain/constants.ts`), mapped to the KB page
[Eligibility data-source mapping](https://keeanlee.atlassian.net/wiki/spaces/NS/pages/32210945)
(its **Determines** and **Provenance** columns are authoritative). **Overclaim fixes:**

- `clearanceG50` → `gap`, source **Unidentified** (G50 owning module unconfirmed). Not OASIS.
- `sar21Currency` → `gap`, source **ATMS** (marksmanship). Not OASIS.
- `atmsTrainingReqMet` → `gap`, source **ATMS**. `ihl` → `gap`, source **Manual YoT CSV** (manual batch, not a clean feed).
- `licence` → `gap`, source **Unidentified** (source system not stated in the corpus).
- `defermentStatus` → source **myDeferment/CICM** (not OASIS-ICT).
- `pes` → source **eHR** (system-of-record eHR/OneOASIS; surfaced, not sourced, in Comd WB). Not OASIS-ICT.

Provenance detail (incl. *"Aspirational — not a live feed; not from OneOASIS"* for `gap`/`hole`)
surfaces in each field's click-through popover — no inline pills.

**Eligibility vs readiness follows the KB Determines column.** The drill-down separates them at
the top level: the **Eligibility** tab carries the call-up gates (Call-Up Deviation, TOS,
Exit-permit/Travel, Offences/AWOL, Tenure/liability, Call-up NR validity, plus PES,
role/appointment, deferment, IHL, Disruption/newborn, G50, licence); the **Readiness** tab carries
the currency signals (IPPT, SAR-21, ATMS flags, MUT/refresher). The *both*-tagged Medical and
Attendance appear in full on the Readiness tab and are mirrored (eligibility slice — MC excusal /
AWOL & disciplinary exceptions) on the Eligibility tab. Readiness informs selection and never
hard-gates eligibility (KB "Design consequence — binding").

**No single "availability" feed.** The KB has no "availability" dataset; that convenience previously
conflated three distinct datasets with different provenance. It is decomposed into `ihl`
(**gap**, incl. overseas study), `disruption` (**hole** — newborn/WOG, captured nowhere today), and
`tenure` (**confirmed** — the min-service/"6-month" gate, threshold unverified). The drill-down still
shows a derived at-a-glance "Availability" label, computed from these.

## OASIS ICT-Management data sets (new fields)

All `confirmed` (OASIS ICT-Management v1.1) unless noted. Concrete value sets are illustrative.

| Field | Shape | Notes |
|-------|-------|-------|
| `callUpDeviation` | `Field<{reasonCode, reasonLabel, illustrative}[]>` | Block mechanism. Non-empty ⇒ Blocked; reason surfaced verbatim. Reasons illustrative (`CALL_UP_DEVIATION_REASONS`). |
| `typeOfService` | `Field<{current: TOSCode, futureDated: {tosCode,startDate,endDate}[]}>` | TOS codes illustrative (`TOS_CODES`); only `ORNS-liable` is ICT-liable. |
| `callUpNR` | `Field<{phaseDate, dateReviewed}>` | Call-up Nominal-Roll validity (`confirmed`). Phase date long before the window or a stale review ⇒ NeedsCheck. |
| `tenure` | `Field<{ornsYears, hkClocked, mut, minServiceMet}>` | Min service before ICT (`confirmed`); a shortfall ⇒ **Blocked** (KB rules table). The "~6-month" threshold is **unverified** — the block's trace detail says so. |
| `disruption` | `Field<{active, reason?}>` | Disruption / newborn / other WOG reason. **`hole`** — captured nowhere today. The engine emits a **cannot-evaluate** trace row and **never gates** on it. |
| `offences` | `Field<{current[], past[], awol}>` | `offenceType` illustrative; `awol` derived from attendance history. |
| `travelHistory` | `Field<{exitPermits[], borderMovements[]}>` | Source **OneOASIS Travel History** (`confirmed`). |
| `ippt` | `Field<{eligibilityCriteria, nsFit, hsp, iptRt, stationExcuses, currentWindow, pastWindow}>` | Expanded IPPT record. |
| `medicalHistory` | `Field<{date, duration, excuse, excuseType, remarks}[]>` | Summary status stays on `medical`. |
| `attendance` | `Field<{activityId, activityLabel, outcome, date}[]>` | outcome ∈ ReportLate / MC / FailedInPro / DeferredOutPro / AWOL / NoPayLeave / ChangeInTrainingPeriod. |
| `trainingStatus` | `Field<{mutRequired, refresherFor}>` | |
| `attachment` | `Field<{type, homeUnit, receivingUnit}>` | type ∈ organic / attached-in / detached-out (cross-unit roll composition). |
| `ihl` | `Field<{studying, institution?, expectedEnd?}>` | **`gap`** — manual Year-of-Training CSV batch, not a clean feed. |

## §6 Eligibility engine (deterministic + explainable)

`src/domain/engine.ts` — ordered rules; the first firing rule sets the state; every rule emits a
reason-trace entry (rule id, label, result, detail, inputs with source/asOf/provenance).
The advisory layer stays advisory (anomaly flag only) and never gates eligibility.

Order + outcomes mirror the KB rules table. **Every rule is evaluated** (the trace is complete);
the **outcome** is then the first `Blocked` by order, else the first `NeedsCheck`, else `Eligible`
— i.e. **blocks win over NeedsCheck** regardless of order (KB: "the first blocking rule sets the
state"). Readiness signals (IPPT, SAR-21, ATMS, MUT) are **not read here** — they never gate.

1. `R0-deviation` — any `callUpDeviation` ⇒ **Blocked** (deviation label surfaced verbatim).
2. `R1-pes` — PES below role requirement ⇒ **Blocked**.
3. `R-tos` — current TOS not ICT-liable, or a future-dated TOS effective across the window ⇒ **Blocked**.
4. `R-tenure` — minimum service before ICT not met ⇒ **Blocked** (the "~6-month" threshold is *unverified*; the block says so in its trace detail).
5. `R2-deferment` — approved deferment ⇒ **Blocked**.
6. `R-overseas` — exit permit overlapping the ICT window ⇒ **Blocked**.
7. `R-ihl` — on study non-availability (IHL / overseas study) ⇒ **Blocked**. *(gap feed)*
8. `R4-licence` — role-required licence expired (Driver) ⇒ **Blocked** (gates the licensed slot).
9. `R5-clearance` — G50 pending/expired or soft (non-role) licence expired ⇒ **NeedsCheck**.
10. `R-offences` — open offence or AWOL ⇒ **NeedsCheck** (route to human).
11. `R-nr` — call-up NR phase date predates the window, or NR not reviewed against it ⇒ **NeedsCheck**.
12. `R-medical` — an **MC** covering the ICT window ⇒ **Blocked (excused)**. *(IPPT is readiness — never read here.)*
13. `R-disruption` — disruption / newborn / WOG ⇒ **cannot-evaluate** — a **hole** (captured nowhere today); shown for transparency but **never gates**.
14. `R6-critical` — unresolved critical-field source conflict ⇒ **NeedsCheck**.

## ICT activity window (first-class input)

The roll is resolved against a specific ICT activity window `{ startDate, endDate }` — an
`IctWindow` (`types.ts`), seeded from `ICT_WINDOW_DEFAULT` (constants) and held as runtime
state in the store. **Nothing downstream assumes "today":** every date-dependent eligibility
rule tests overlap with the window (TOS future-dated, exit-permit/overseas, medical excuse), and
the window is threaded through `enrich(record, window)` / `resolveEligibility(record, window)`.
Data-freshness/staleness (`isStale`) stays relative to `NOW` — it measures how old a data pull
is, not the activity dates.

- **Capture / what-if** — the roll header carries start/end date fields plus "±1 week" shift
  buttons; editing re-derives the whole roll (`store.setIctWindow` / `shiftWindow`).
- **No silent re-block** — on any window change the store diffs the new roll against the previous
  one and exposes a `changes` map (before/after per NSman). Flipped records show a "changed" badge
  in the roll and a before→after callout in the drill-down.
- **Header context** — the active window is shown in the app header.
- **Seam for phases** — v0 is a single window. Per-phase dates (each ICT phase with its own date)
  are a later extension; `IctWindow` is the seam to widen into an array of phase windows.

ICT window: `ICT_WINDOW_DEFAULT` in constants seeds the runtime window (illustrative dates).

## §5a Unblock / waiver flow (mocked)

Blocked men expose an **Unblock Servicemen request** dialog (mirrors OASIS): one justification
field per Call-Up Deviation (or one synthesized from the block reason), then a mocked
"Submit for approval". No routing runs in v0; the record stays Blocked pending a decision.

## §3 UI

- **Nominal roll** — eligibility chip (`Eligible / Blocked(reason) / NeedsCheck`) using the
  Call-Up Deviation / rule reason as the blocked label; attachment flag (attached-in / organic /
  detached-out); G50/SAR chips shown dashed (`gap`). Provenance legend visible on the screen.
- **Drill-down tabs** — Summary, Eligibility (reason trace, plus OASIS-mirrored cards: TOS incl.
  future-dated, Travel History, Offences, Tenure/liability, Call-up NR validity, and the *both*-tagged
  Medical/Attendance eligibility slices), Readiness (IPPT, Medical history, Attendance, per-field
  provenance + legend).

## §7 Synthetic data

`npm run gen:data` (seeded, deterministic). ~120 NSmen with planted illustrative edge cases:
Call-Up Deviations, current/future-dated non-liable TOS, overseas exit permits spanning the ICT,
AWOL/offence cases, IPPT/medical currency, and ~13% attached-in. Every concrete value is
illustrative; no percentage is measured.

## Out of scope (v0)

Real integrations, approval routing, and comms delivery are mocked. Phase-2 approval/unblock
module is not built.
