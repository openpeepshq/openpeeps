# ADR: OpenPeeps component framework boundaries

## Status

Accepted — incremental migration; see phase checklist in this ADR.

## Context

The web UI is split across `@openpeepshq/react-ui`, `@openpeepshq/react`, and
`@openpeepshq/web`, with a parallel tree in `@openpeepshq/rn-components`. Forms,
navigation, and theme overrides were inconsistent (custom Zod Form vs RHF,
string paths, primary-only theme injection). The component audit
(`code/reports/component-audit`) and AllPeep UI 2026 Figma file are the design
sources of truth.

## Decision

### Package roles

| Package | Owns | Must not own |
| --- | --- | --- |
| **react-ui** | Design-system primitives, tokens, theme injection, RHF field wrappers, layout chrome with no domain types | `@openpeepshq/common` types, `openpeepsApi`, auth/profile providers |
| **react** | Domain components, pages, `NavTarget` API + pluggable menus, domain hooks/controllers | Concrete URL strings, `react-router` |
| **web** | Path `Navigator`, `App.tsx` route table, host bootstrap | Page UI |
| **rn-components** | Native screens/chrome; shared hooks/controllers from react | DOM components from react-ui (for now) |

**Move to react-ui** only when a module has no `@openpeepshq/common` types **and**
no `openpeepsApi` / domain context imports.

### Colocation

- A helper used by only one consumer and under 25 lines of code stays in the
  consumer file (non-exported).
- Everything else: one component per file, named export, barrel via `index.ts`.

### Navigation

Domain code navigates with typed `NavTarget` values. Host apps (web today)
implement a Navigator that maps targets ↔ paths. No hard-coded path strings in
`platform/react` components or pages.

### Theme overrides (runtime)

Communities may override at runtime via config + CSS variables:

- Primary color → `--color-primary` / `--color-primary-foreground`
- Secondary color → `--color-secondary` / `--color-secondary-foreground`
- Font → `--theme-font-family-base` / `--theme-font-family-heading`
- Button border radius → `--theme-rounded-base`
- Default (card/modal) radius → `--theme-rounded-container`

Applied through `applyThemeOverrides` in react-ui.

### Forms

Web forms use **react-hook-form** + Zod resolvers (same schemas as
`@openpeepshq/common`), matching React Native.

## Phase checklist

- [x] Phase 0 — ADR + react-ui ESLint boundary; Figma token baseline
- [x] Phase 1 — Runtime theme overrides (`applyThemeOverrides`)
- [x] Phase 2 — `NavTarget` + web Navigator + menu migration
- [x] Phase 3 — RHF Form primitives; Login migrated; LegacyForm shim
- [x] Phase 3b — Remaining LegacyForm call sites migrated; shim removed
- [x] Phase 4 — P0 primitives + Button Figma variants + codemod
- [x] Phase 5 — Pages → `@openpeepshq/react/pages`; colocation pass
- [x] Phase 6 — Non-DOM hooks (join group, post actions, conversation, jam leave)

## Consequences

- Multi-PR migration; one conventional commit per branch per OpenPeeps CI.
- ESLint forbids domain imports inside `libraries/react-ui`.
- RN continues with NativeWind primitives; shares hooks first, not DOM UI.
