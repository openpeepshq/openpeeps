# OpenPeeps component gallery

Fixture-driven showcase of `@openpeepshq/react-ui` and domain UI from
`@openpeepshq/react`, grouped as **atoms**, **molecules**, and **organisms**.
Multi-version static site (same pattern as `docs-site/`), hosted at
`components.openpeeps.org`.

## Quick start (local preview)

From the monorepo root:

```bash
pnpm gallery:dev
```

Or equivalently:

```bash
pnpm --filter @openpeepshq/component-gallery dev
```

Then open **http://localhost:5176**.

The first run builds `@openpeepshq/common`, `client`, and `i18n` once (`predev`).
Vite then serves the gallery and **resolves `react-ui` + `react` from source**, so
edits under `libraries/react-ui/` or `platform/react/` hot-reload without a
package rebuild. That is the usual workflow when changing components.

Single-version only in this mode (the version switcher stays hidden until you
have a multi-version `dist/` with more than one entry).

## After changing shared packages

If you change `@openpeepshq/common`, `client`, or `i18n`, rebuild them (or
re-run `pnpm gallery:dev` so `predev` runs again):

```bash
pnpm --filter @openpeepshq/common build
pnpm --filter @openpeepshq/client build
pnpm --filter @openpeepshq/i18n build
```

## Local multi-version build

```bash
pnpm --filter @openpeepshq/component-gallery build:local
pnpm --filter @openpeepshq/component-gallery preview
```

`build:local` builds only the working tree as `main` into `dist/main/`.
`preview` serves that tree (still on port 4173 by default unless overridden).

## Production multi-version build

```bash
pnpm --filter @openpeepshq/component-gallery build
```

Candidates: `main`, `staging`, last five `*-RELEASE` tags. A ref is included
**only if** it contains `examples/component-gallery/package.json`, so older
releases without this app never appear in the switcher.

## Adding a showcase

1. Add an entry in `src/showcases/atoms.tsx`, `molecules.tsx`, or
   `organisms.tsx` (domain composites live in `src/showcases/domain/`).
2. Register new modules in `src/registry.ts`.
3. Prefer fixture props + gallery providers; skip LiveKit / upload / admin
   flows that need a live API.
4. Small variant sets (Button, Badge, Tooltip) render inline. Larger ones
   (overlays, charts, PopupMenu placements) use the variant dropdown.

## Deploy

Forgejo workflow `.forgejo/workflows/component-gallery.yaml` builds the
multi-version tree and pushes
`code.openpeeps.org/openpeeps/openpeeps-components:{sha,latest}`.
Devops stack: `code/devops/services/openpeeps-components/` →
`components.openpeeps.org`.
