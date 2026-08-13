# ICTMS — Readiness Orchestration Layer (v0 prototype)

A commander-facing, clickable prototype of a readiness **orchestration layer**: it
ingests readiness data from several (mocked) source systems, reconciles it into one
**high-confidence nominal roll**, and lets a unit commander select NSmen for an ICT
with **eligibility already resolved** — then hands off to approval/comms (mocked).

> Prototype on **synthetic data** — no real integrations, no backend, no persistence.
> The *system name is a placeholder*. Schema/enums are grounded & cited; the values and
> distributions are **illustrative demo texture only** and must never be read as real data.

## What it proves (v0 scope)

The front of the chain only: **ingest → high-confidence roll → select**. Approval and
comms are visible endpoints, not built. Core hypothesis made tangible: *a commander can
trust the roll enough to select from it directly, without triangulating multiple systems
or routing through the S8.*

## Screens

1. **Dashboard** — unit strength, Eligible / Needs-check / Blocked tiles, roll-confidence
   indicator, breakdown by sub-unit and vocation.
2. **Nominal roll** — ~120 synthetic NSmen with eligibility + confidence badges, filters,
   select mode (blocked pre-flagged & locked out), running selected strength vs target.
3. **Drill-down** — Summary / Eligibility / Readiness / ICT-records tabs, per-field
   provenance (source + as-of), stale flags, conflict badges.
4. **Handoff** — mocked "sent for approval → broadcast" stepper.

## The two ideas the prototype makes concrete

**1. High confidence is shown, not asserted (`§6a` "show your work").**
Every determination reveals the rule and the inputs that produced it, at the point of the
answer. The eligibility engine (`src/domain/engine.ts`) returns, per NSman, not just the
state but a **reason trace** (rule id + inputs). Click any eligibility / confidence /
stale / conflict signal to reveal the rule and values behind it.

- Eligibility = deterministic block rules applied in order; first match decides.
- Record confidence = High / Medium / Low from field currency + conflicts + resolution.
- Roll confidence = a roll-level rubric over the record mix.

**2. AI is advisory and separated (`§6b`).**
AI-style signals are clearly labelled suggestions, visually separated from the rules-based
decision layer, and **never gate eligibility**: a mocked **turn-up likelihood %** (with
its basis), **anomaly flags** ("check this record"), a **plain-language "why"** narrating
the deterministic trace, and **succession suggestions** ("could fill this slot").

## Data provenance discipline (`§0`)

Fields/enums trace to sources and carry provenance tags in `src/domain/types.ts`:
`[confirmed]` (Comd WB v0.6 / NS playbooks), `[gap]` (PRE-1 target data the layer would
add — mocked, aspirational), `[unverified]` (ICT-03 garbled transcript — reconstructed).
Unverified block reasons heard only in ICT-03 ("ROVERS", "TOS / NOE") are **removed**
pending S8 / HRSSC-NSSC confirmation, per spec.

## Design system

Built with **PRIZM 4.0** (Enterprise zone, light mode). PRIZM components are reused
(Badge, Card, Table, Tabs, Popover, Select, Checkbox, Switch, Progress, Alert, …) via the
copy-paste model into `src/components/ui/`. Semantic Tailwind tokens only
(`bg-bg`, `text-fg`, `bg-accent`, `border-border`, …) — no raw colour utilities. Fonts are
self-hosted and there are **no external URLs at runtime** (air-gap safe).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
```

Build / regenerate data:

```bash
npm run build    # type-check + production build → dist/
npm run gen:data # regenerate src/data/nsmen.json (tunable distributions)
```

## Layout

```
src/
  domain/        types.ts (schema + provenance), constants.ts (rules params),
                 engine.ts (eligibility + confidence + advisory, all explainable)
  data/          nsmen.json (generated synthetic dataset)
  components/    ui/ (vendored PRIZM components), signals.tsx (badges + explain popovers),
                 advisory.tsx (AI-advisory signals), AppShell.tsx
  screens/       Dashboard / Roll / Drilldown / Handoff
  store.tsx      in-memory state (enriched records, selection, navigation)
scripts/gen-data.ts   seeded synthetic generator (distributions tunable)
```

## Non-goals / guardrails (v0)

No real integration, no backend, no writing to any system of record (read + select only),
no approval-routing / comms logic (endpoints mocked), everything capped at
OFFICIAL(CLOSED) — masked NRIC, no sensitive free-text. Not for operational use.

Phase 2 (approval / unblock module) is out of scope for v0 — see the prototyping spec.
