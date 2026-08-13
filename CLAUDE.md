# ICTMS prototype — project rules

Clickable v0 prototype of a **Readiness Orchestration Layer** (commander-facing). React +
TypeScript + Vite + Tailwind v4. Synthetic data only, in-memory, no backend.

## PRIZM design system (follow verbatim)

- Built with **PRIZM 4.0**, **Enterprise** zone, **light** mode. Local checkout:
  `~/Claude/PRIZM 4.0` (read `PRIZM.md` + `llms.txt` + `lib/components-api.ts` there).
- **Reuse before you build.** Search `llms.txt` / `components-api.ts` for a PRIZM component
  before hand-rolling any UI. If one fits, use it as-is (adjust exposed props/variants only).
  If nothing fits, stop and say so, naming what you checked.
- Components are vendored copy-paste under `src/components/ui/`. `cn()` is in `src/lib/utils.ts`.
- **Semantic tokens only**: `bg-bg`, `bg-surface`, `text-fg`, `text-fg-muted`, `bg-accent`,
  `border-border`, `text-success/warning/danger/info`, `bg-bg-muted`. Never raw utilities
  like `bg-slate-500` / `text-blue-600`.
- Confidence / eligibility signals use PRIZM **Badge** variants (`success/warning/danger/
  outline/subtle`), not custom-coloured chips.
- **Air-gap safe**: no external URLs (CDNs, remote fonts, third-party scripts). Fonts are
  self-hosted in `public/fonts` and declared in `src/styles/fonts.css`.
- Base UI composition uses the `render` prop (e.g. `<PopoverTrigger render={<button/>} />`),
  not Radix `asChild`. Sub-components are flat named exports (`CardHeader`, `TabsList`).

## Domain rules live in one place

`src/domain/engine.ts` is the single source of truth for eligibility, confidence, and the
AI advisory mock. It is **deterministic and explainable** — every determination returns a
reason trace (rule id + inputs) that the UI renders on demand. Keep the decision layer
(rules) and the advisory layer (AI, labelled suggestions) separate; AI never gates
eligibility.

## Data discipline

Schema/enums are grounded & cited (provenance tags in `src/domain/types.ts`). Synthetic
**values** are illustrative demo texture only — never present as real. Don't invent domain
concepts, taxonomies, or distributions. If unsure whether something exists, leave it out or
mark it `[unverified]`.

Regenerate the dataset with `npm run gen:data` (seeded, tunable in `scripts/gen-data.ts`).
