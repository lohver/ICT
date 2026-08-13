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
Exit-permit/Travel, Offences/AWOL, plus PES, role/appointment, availability, deferment, IHL, G50,
licence); the **Readiness** tab carries the currency signals (IPPT, SAR-21, ATMS flags, MUT/
refresher) plus the *both*-tagged Medical and Attendance. Readiness informs selection and never
hard-gates eligibility (KB "Design consequence — binding").

## OASIS ICT-Management data sets (new fields)

All `confirmed` (OASIS ICT-Management v1.1) unless noted. Concrete value sets are illustrative.

| Field | Shape | Notes |
|-------|-------|-------|
| `callUpDeviation` | `Field<{reasonCode, reasonLabel, illustrative}[]>` | Block mechanism. Non-empty ⇒ Blocked; reason surfaced verbatim. Reasons illustrative (`CALL_UP_DEVIATION_REASONS`). |
| `typeOfService` | `Field<{current: TOSCode, futureDated: {tosCode,startDate,endDate}[]}>` | TOS codes illustrative (`TOS_CODES`); only `ORNS-liable` is ICT-liable. |
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

Order (first match wins):

1. `R0-deviation` — any `callUpDeviation` ⇒ **Blocked** (deviation label surfaced verbatim).
2. `R-tos` — current TOS not ICT-liable ⇒ **Blocked (TOS)**; future-dated TOS overlapping the ICT window ⇒ **NeedsCheck**.
3. `R-overseas` — exit permit overlapping the ICT window ⇒ **Blocked (Overseas)**.
4. `R1-pes` — PES below role requirement ⇒ Blocked.
5. `R2-deferment` — approved deferment ⇒ Blocked.
6. `R3-availability` — IHL / disruption / overseas-study / <6-month ⇒ Blocked.
7. `R4-licence` — role-required licence expired (Driver) ⇒ Blocked.
8. `R-offences` — open offence or AWOL ⇒ **NeedsCheck** (route to human).
9. `R5-clearance` — G50 pending/expired or soft-licence expired ⇒ NeedsCheck.
10. `R-medical` — IPPT `Fail`, a station excuse, or a medical excuse overlapping the ICT window ⇒ NeedsCheck.
11. `R6-critical` — unresolved critical-field source conflict ⇒ NeedsCheck.

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
- **Drill-down tabs** — Summary, Eligibility (reason trace), plus OASIS-mirrored, confirmed-sourced
  tabs: Medical, IPPT, Offences, Travel History, TOS (incl. future-dated), Attendance; Readiness
  (per-field provenance + legend).

## §7 Synthetic data

`npm run gen:data` (seeded, deterministic). ~120 NSmen with planted illustrative edge cases:
Call-Up Deviations, current/future-dated non-liable TOS, overseas exit permits spanning the ICT,
AWOL/offence cases, IPPT/medical currency, and ~13% attached-in. Every concrete value is
illustrative; no percentage is measured.

## Out of scope (v0)

Real integrations, approval routing, and comms delivery are mocked. Phase-2 approval/unblock
module is not built.
