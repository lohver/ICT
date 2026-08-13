# Self-hosted fonts

PRIZM 4.0 self-hosts all fonts for air-gap compatibility — no external CDN references anywhere in the codebase.

## Files present

### Inter (primary sans)

Variable woff2, from [rsms.me/inter](https://rsms.me/inter/).

```
public/fonts/Inter/
├── InterVariable.woff2
├── InterVariable-Italic.woff2
└── OFL.txt
```

### JetBrains Mono (code / mono)

Variable TrueType, from [JetBrains](https://www.jetbrains.com/lp/mono/) or [Google Fonts](https://fonts.google.com/specimen/JetBrains+Mono).

```
public/fonts/JetBrainsMono/
├── JetBrainsMono-VariableFont_wght.ttf
└── OFL.txt
```

woff2 is preferred for the web where it's published (Inter); `.ttf` is an acceptable fallback (JetBrains Mono doesn't ship woff2, and mono is only used for code/labels, so the size cost is small).

## How they're loaded

The docs site does **not** `@import` `styles/fonts.css`. Because the site deploys under a `/prizm` subpath, the `@font-face` rules are injected from `app/layout.tsx` with basePath-aware URLs (see `fontFaceStyles` there) — a static `url("/fonts/…")` would 404 under the subpath. `styles/fonts.css` remains the copy-paste artifact for consumers, whose apps usually serve from root.

## JavaFX

The JavaFX library bundles its own copies — static Inter weights (Regular/Medium/SemiBold/Bold) + the JetBrains Mono `.ttf` — in `javafx/src/main/resources/prizm/fonts/`, loaded via `PrizmTheme`. JavaFX can't use woff2 and its variable-font support is weak, hence the static `.ttf` weights there.

## License

Both fonts are under the SIL Open Font License (OFL). The `OFL.txt` licence file must be retained alongside the fonts when redistributing.

## Why self-hosted

- **Air-gap compatibility** — secured environments cannot reach the Google Fonts CDN
- **Performance** — eliminates a network round-trip on first paint
- **Privacy** — no third-party tracking via font requests
- **Reproducibility** — fonts are versioned with the rest of the system

## The air-gap audit

`pnpm audit:airgap` fails CI if any code references `fonts.googleapis.com`, `fonts.gstatic.com`, or other font CDNs. The font folders themselves are excluded from the scan (their `OFL.txt` text contains a `scripts.sil.org` URL).
