# AGENTS.md

Guidelines for coding agents working in this repository. Read this before
making changes. These rules are not optional.

## Prime directives

1. **Keep overall complexity low.** The simplest solution that fully solves the
   problem wins. Fewer moving parts, fewer abstractions, fewer files.
2. **Be terse.** Write the least code that does the job clearly. No speculative
   generality, no dead code, no "just in case" options or parameters.
3. **Code quality over speed.** Don't take shortcuts that leave the codebase
   worse than you found it.
4. **Consistency beats cleverness.** Match the surrounding code's patterns even
   when you'd personally prefer another approach. A consistent codebase is more
   valuable than any local optimization.
5. **Refactor when it simplifies.** If a change becomes cleaner by first
   simplifying existing code, do the refactor. Leave things simpler than you
   found them — never bolt complexity onto a shaky structure to avoid touching
   it.

## Explaining your changes

**Any change that touches more than 3 files OR changes more than 6 lines must be
accompanied by a written outline of exactly what changed and why.**

- List each file touched and the reason for the change to it.
- Explain the "why", not just the "what" — what problem it solves and which
  approach you chose over alternatives.
- For commits/PRs this goes in the message body. For a chat response it goes in
  the summary. Trivial changes (≤3 files and ≤6 lines) need no outline.

## Language & style (inferred from the codebase — follow it)

- **Arrow functions only.** Define functions as `export const fn = (args) => …`.
  Do not use `function` declarations.
- **No TypeScript classes.** This codebase does not use `class`. Model behavior
  with functions and plain data; model data with types and Zod schemas.
- **Named exports.** No default exports except where a framework requires them
  (e.g. email template `index.ts`).
- **`type` and `interface` for shapes; Zod for runtime-validated data.** Where a
  schema exists, derive the type with `z.infer<typeof schema>` rather than
  hand-writing a duplicate type.
- **Prefer immutability.** `const` over `let`; avoid mutation; prefer
  `map`/`filter`/`reduce` and spreads over in-place edits.
- **No `any`.** It is an ESLint warning and should be treated as an error. Use
  precise types or `unknown` + narrowing.
- **Prefix intentionally-unused identifiers with `_`** (matches the lint rule).
- **Barrel files.** Each module exposes its public surface via `index.ts`.
  Export new public symbols there; import from package roots
  (`@openpeeps/common`, `@openpeeps/core`, …), not deep relative paths across
  packages.

## Comments

- Comment **why**, not **what**. Do not narrate the code.
- No comments that restate the next line. Delete obvious/redundant comments.
- A short comment explaining a non-obvious constraint, trade-off, or edge case
  is welcome.

## Formatting & linting

- Prettier and ESLint are the source of truth. Config: 2-space indent, single
  quotes, trailing commas (`all`), 80-column print width.
- Do not hand-format against the tools. Run `pnpm format` / `pnpm lint` in the
  package you touched.
- Fix any lint errors you introduce before finishing.

## Repository layout

- pnpm workspace monorepo. Packages live under `platform/*` and `libraries/*`.
- `platform/common` — shared types and utilities (Zod schemas live here).
- `platform/core` — backend logic: DB, notifications, email, jobs, roles.
- `platform/server` — API server (Riddl); add new API endpoints here.
- `platform/web` — web client (React); add new UI here.
- `platform/react`, `platform/react-native` — React/RN clients.
- `platform/worker` — BullMQ workers (email, media, notifications, events).
- `platform/i18n` — locale files; user-facing strings go in `locales/en.json`.

## Build, test, lint

- Install: `pnpm install`.
- After editing a `platform/*` or `libraries/*` package, rebuild it so consumers
  pick up changes: `pnpm --filter @openpeeps/<pkg> build` (build dependencies
  before dependents — typically `common` → `core` → server/worker/web).
- Tests use Vitest: `pnpm --filter @openpeeps/<pkg> test` (or
  `pnpm exec vitest run <path>` within a package).
- Verify the packages you touched build cleanly before finishing.

## Conventions to respect

- **i18n:** never hardcode user-facing copy. Add a key to `locales/en.json` and
  reference it via the `t()` function.
- **Data migrations:** changes to stored data shape need a migration under
  `platform/core/src/db/dataMigrations/migrations/`, registered in
  `migrations.ts`, keyed with a UUIDv7 (`pnpm --filter @openpeeps/core uuidv7`).
- **Capabilities:** gate features by role capabilities (`core-*`) rather than
  hardcoded role checks.
- **Async work** belongs in a BullMQ queue/worker, not inline in request paths.

## Git & PRs

- Only commit when explicitly asked.
- Conventional-commit style subjects: `type(scope): summary`
  (e.g. `fix(media): …`, `feat(events): …`).
- For non-trivial changes, the body must contain the change outline described
  above.
- Don't force-push shared branches or amend pushed commits unless asked.
- Branches need to be rebased on main to be merged
- PRs into main need to have exactly one commit that is different
- Commit messages and PR descriptions may **reference** issues (e.g.
  `References #827`, or a link in the body) but must **not** claim to fix or
  close them — avoid `Fixes #…`, `Closes #…`, `Resolves #…`, and similar
  auto-close phrasing.