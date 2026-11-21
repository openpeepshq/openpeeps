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
  Export new public symbols there.
- **`@openpeepshq/*` import depth.** Import from the package root
  (`@openpeepshq/core`, `@openpeepshq/common`, …) **or at most one subpath
  segment** (`@openpeepshq/core/jams`, `@openpeepshq/common/types`,
  `@openpeepshq/react/email`). No deeper chains
  (`@openpeepshq/core/db/explorer`, `@openpeepshq/react/pwa/vite`). One-level
  entry points are the public surface (`package.json` `exports` `./*` →
  `dist/*/index.js`); re-export nested modules from that segment’s barrel
  instead of importing deeper.

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

- pnpm workspace monorepo. Packages live under `platform/*`, `libraries/*`,
  and `plugins/*/*`.
- `platform/common` — shared types and utilities (Zod schemas live here).
- `platform/core` — backend logic: DB, notifications, email, jobs, roles, plugin loader.
- `platform/server` — API server (Riddl); add new API endpoints here.
- `platform/web` — web client (React); add new UI here.
- `platform/react` — React client (includes plugin registry). `platform/rn-components` — React Native client.
- `platform/worker` — BullMQ workers (email, media, notifications, events).
- `platform/i18n` — locale files; user-facing strings go in `locales/en.json`.
- `plugins/<namespace>/<name>` — plugin packages. See `platform/web/docs/development/plugins.md` for the contract.

## Run the app

To run OpenPeeps locally, use the `run-openpeeps` skill
(`.agents/skills/run-openpeeps/SKILL.md`). Do not improvise setup or startup
steps — follow that skill.

## Build, test, lint

- Tests use Vitest: `pnpm --filter @openpeepshq/<pkg> test` (or
  `pnpm exec vitest run <path>` within a package).
- Rebuild, lint, and verify touched packages before finishing — see
  `check-openpeeps-pr-readiness` when preparing a PR.

## CI gates — run before every push (mandatory)

CI (`.forgejo/workflows/build.yaml`) fails the whole merge-gate for any of the
checks below. Run the exact same commands on the final (squashed) head before
pushing; a CI failure on one of these is an implementation defect, not bad
luck. The commands need no Docker, no database, no backing services.

| Gate (CI job)   | Command to run locally before push                                                                                                                |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| commit-check    | `node scripts/check-branch.mjs && node scripts/check-pr-references.mjs`                                                                           |
| lint (prettier) | `pnpm exec prettier --check .` at repo root — CI is NOT scoped per-package                                                                        |
| lint (eslint)   | `pnpm run -r lint`                                                                                                                                |
| i18n-check      | `node scripts/check-i18n-parity.mjs --strict` (only if locale files changed)                                                                      |
| publish-gate    | `node scripts/check-publish-gate.mjs --package <p>` for every bumped published package                                                            |
| frozen lockfile | `pnpm install --frozen-lockfile` (only if `package.json` / `pnpm-workspace.yaml` / `pnpm-lock.yaml` changed)                                      |
| test-unit       | `pnpm --filter @openpeepshq/<pkg> exec vitest run` per touched package (rn-components uses jest: `pnpm --filter @openpeepshq/rn-components test`) |
| typecheck       | `pnpm --filter <pkg> typecheck` for touched packages and their dependents (build `common` → `core` first)                                         |

Note on the publish-gate row: `core` and `i18n` are published to npm as well,
but are intentionally not gated by `scripts/check-publish-gate.mjs` — they have
no per-package `typecheck` script (the gate's first step) and their packed
source is a `dist/` build, so adding them would fail on both. The CI publish
job ships them on version bumps without the gate; closing that coverage gap is
tracked as a separate item.

Rules behind the gates, each tied to a real failure class:

- **Exactly one commit, at every push.** Every pushed state of a PR branch must
  carry exactly one commit ahead of `main` — `commit-check` rejects anything
  else and the whole merge-gate goes red with it. The squash is not a one-time
  "before the PR" step: after a fix-up, amend into the single commit
  (`bash scripts/squash-branch.sh --ci -m "<type(scope): description>"`) and
  `git push --force-with-lease`. Never stack a second commit on a PR branch.
- **`References #N` only.** Never `Fixes #N`, `Closes #N`, `Resolves #N` — in
  commit messages and in the PR body (auto-close keywords fail `commit-check`;
  the issue must stay open until QA on `main`).
- **Prettier is repo-wide.** `pnpm format` inside one package does not cover
  CI's `prettier --check .` over the monorepo. Run
  `pnpm exec prettier --write <every touched file>` (or `--check .` at the
  root) on the final tree — new files count too.
- **Lockfile changes are commit-atomic.** Any edit to a `package.json` or
  `pnpm-workspace.yaml` (dependency add/remove/override, version bump) must be
  paired in the same commit with a regenerated `pnpm-lock.yaml` from a clean
  tree (`pnpm install` at repo root), verified with
  `pnpm install --frozen-lockfile`. A manifest change without a matching
  lockfile turns every CI job red (`ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` /
  `ERR_PNPM_OUTDATED_LOCKFILE`), including the Docker image build.
- **Unit tests must not require Postgres or Redis.** CI's `test-unit` job runs
  in a bare `node:24-alpine` container — a unit test that connects to
  `127.0.0.1:5432` (or whose before/after hooks open a DB/redis connection
  unconditionally) passes on a dev machine and fails CI. DB-backed
  integration-style tests belong in the integration suite; any unavoidable DB
  touch in a unit test must skip cleanly when the service is unreachable
  (`describe.skipIf(!await pgReachable())`), and hooks must fail fast instead
  of hanging into `hookTimeout`.
- **i18n: both locales in the same commit.** Every new user-facing key lands
  in `locales/en.json` and `locales/de.json` together (strict parity gate).
- **Ship the migration with the schema read.** Every new column/table the diff
  reads needs its `db:generate`d SQL file under `platform/core/src/db/pg/sql/`
  in the same PR — the integration image runs migrations on boot, and a read
  without its migration 500s at runtime.
- **Version bumps follow the decision table** in the
  `check-openpeeps-pr-readiness` skill: `feat:` → minor in every touched
  published package; `fix:` without new API surface → no bump; never private
  packages; check open sibling PRs touching the same `package.json` before
  choosing the number.

## Environment & dependency changes (automation worktrees)

Automation runs work in git worktrees of the warm seed checkout
(`/home/openhands/.openhands/workspaces/openpeeps`), whose root `node_modules`
is normally symlinked into the worktree so no install is needed.

- If the change touches any `package.json`, `pnpm-workspace.yaml`, or
  `pnpm-lock.yaml`, **remove the symlink first**
  (`rm <worktree>/node_modules`) and run `CI=1 pnpm install` — then commit the
  regenerated `pnpm-lock.yaml` in the same commit as the manifest change and
  verify `CI=1 pnpm install --frozen-lockfile` passes. The `CI=1` is what
  makes pnpm non-interactive.
- **Never run `pnpm install` with the symlinked seed store present.** pnpm's
  purge-mismatch prompt then waits for a keypress that never comes in a
  non-interactive terminal, and the command hangs forever with no output
  (killed an implementation run for #2183 on 2026-11-18).
- Hang escape: if any terminal command shows no new output on two consecutive
  polls, send `C-c` and change approach or add an explicit `timeout` — a
  hung `pnpm`/`npm`/`git` process in an empty-output loop is a prompt or
  network stall, not slowness.

## Conventions to respect

- **No PR labels or milestones.** When opening pull requests, do not add labels
  or milestones. Let maintainers apply those manually.
- **Organization-level labels only.** Never create or use repository-level
  labels. Use only the labels defined for the openpeeps organization.
- **Flow labels belong on the issue, not the PR.** `flow/*` labels are always
  set on the issue an MR references — never on the MR itself. When work moves
  an issue through the flow, update the `flow/*` label on the issue. The full
  set of stages, who moves an issue between them, and the rules every
  automation follows are specified in [Issue Flow](#issue-flow).
- **Theme colors only.** Components must use semantic theme colors (CSS-variable-
  b based tokens like `border-border`, `text-muted-foreground`) instead of
  direct Tailwind color values (like `gray-300`, `blue-500`). Theme tokens are
  defined in the Tailwind preset at `libraries/react-ui/tailwind.preset.cjs`.
- **i18n:** never hardcode user-facing copy. Add a key to `locales/en.json` and
  reference it via the `t()` function.
- **Web and native stay in sync.** `platform/rn-components` mirrors
  `platform/react` component for component. Every UI change in
  `platform/react` (new component, changed layout, behavior, or copy) must be
  made in the matching `platform/rn-components` component in the same change.
  Keep logic in shared hooks under `platform/react/src/hooks` (exported via
  `react-native.ts`) so both sides consume the same behavior; only the
  rendering layer differs.

  When mirroring a React component to the matching `rn-components`
  component, be careful that **click/navigation parity** is not lost. On Web,
  interactivity is often supplied by the _parent_ — an `<a>` wrapper in a list or
  feed, or a clickable `<a>` for download links — rather than by the component
  itself. In RN there is no `<a>` equivalent, so you must add an explicit
  `Pressable` (with `useNavigation` → `navigate('Post', …)` or `Linking.openURL`)
  wherever the Web version relies on an anchor or inherited `onClick`
  (`stopPropagation` on Web maps to RN's nested-`Pressable` containment). Equally,
  plain Web text that renders as a clickable `<a>` (e.g. a "Download" label) must
  become a `Pressable` on RN; a bare `Text`/`ThemedText` is inert. Always ask:
  "what makes this clickable on Web, and how do I replicate that in RN?" and verify
  both the list-in-library and detail-screen rendering paths.

- **Shell boundaries are Web-defined.** Whether a route lives in or out of the
  sidebar shell is decided by the Web router (`/events/:eventId/jam`, `/about`,
  `/code-of-conduct` sit outside it; tabs and most pages live inside it) and is
  the source of truth for native. Do not special-case a single route with a
  procedural `if`; model it as a named set so Web parity is data, not a
  per-screen hack. A route is only truly full-screen when _both_ the inner
  `RootLayout` and the outer `Wrapper` (side-menu shell) are bypassed — skipping
  one still leaves the shell.
- **Schema migrations:** changes to stored data shape go through **Drizzle SQL**.
  Update tables under
  `platform/core/src/db/pg/schema/`, then
  `pnpm --filter @openpeepshq/core db:generate -- --name snake_case_what_it_does`
  (SQL lands in `platform/core/src/db/pg/sql/`) and apply with `db:migrate`
  (also runs on server start). See `platform/core/docs/postgres-schema-adr.md`.
  Filenames must describe the change (`NNNN_snake_case_what_it_does.sql`, e.g.
  `0011_drop_data_migrations.sql`). Always pass `--name`. Do not commit
  drizzle-kit’s default Marvel-style tags (`silly_mariko_yashida`,
  `bizarre_chat`). If generate produced one, rename the SQL file and the
  matching `_journal.json` `tag` before committing. Keep only the latest
  `meta/NNNN_snapshot.json` — drizzle-kit does not prune older snapshots, so
  delete stale ones in the same commit. One-off PG data backfills belong in an
  intentional SQL migration or a documented one-shot script.
- **Queries:** keep `platform/core/src/db/pg/map/` for existing document/edge
  call sites, but **new features and hot-path work** should prefer Drizzle /
  SQL-native queries (typed repositories under domain modules or
  `db/pg/queries/`) over deepening the map DSL (`filters.ts`, `relations.ts`,
  `registry.ts`). Expand the map layer only when an existing mapping call site
  truly requires it. See `platform/web/docs/development/data-storage.md`.
- **Capabilities:** gate features by role capabilities (`core-*`) rather than
  hardcoded role checks.
- **Async work** belongs in a BullMQ queue/worker, not inline in request paths.
- **CHANGELOG.md:** do not touch or regenerate manually. It is generated
  automatically from conventional commits by the nightly build via
  `scripts/generate-changelog.mjs`.

## Issue Flow

Issues move through a fixed pipeline of `flow/*` stage labels. An issue has
**exactly one** flow stage label at a time (a run that finds an issue with zero
or two flow labels is dealing with a labeling bug: skip it and name it in the
run summary). Stages, and what moves an issue into each, are:

| Stage label                  | Meaning                                                                                                                                                                                                            | How the issue arrives here                                                                                                                            |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `flow/needs-specs`           | New issue, not yet fully specified. Open questions are being asked in comments.                                                                                                                                    | **Intake** automation (new, unlabelled issues)                                                                                                        |
| `flow/ready-to-schedule`     | Well-defined and prioritized; waiting to be picked for planning.                                                                                                                                                   | **Intake** automation (clear issues), or human (from `flow/needs-specs` once questions are answered)                                                  |
| `flow/ready-to-plan`         | Scheduled; needs an implementation plan.                                                                                                                                                                           | Human (from `flow/ready-to-schedule`)                                                                                                                 |
| `flow/ready-to-review-plan`  | A plan exists; the plan needs a human sign-off.                                                                                                                                                                    | **Planning** automation (from `flow/ready-to-plan`)                                                                                                   |
| `flow/ready-to-implement`    | Plan approved; the implementation (or re-implementation) should happen.                                                                                                                                            | Human (from `flow/ready-to-review-plan`), or **Review** automation (from `flow/ready-to-review` when every suggestion is test/doc/quality/dependency) |
| `flow/ready-to-review`       | A PR exists that implements the plan; it needs a code review.                                                                                                                                                      | **Implementation** automation (from `flow/ready-to-implement`)                                                                                        |
| `flow/ready-to-merge`        | Review passed with no open suggestions. A **human fork**: the human decides whether the PR goes straight to the merge (`flow/merge-accepted`) or is first verified on the test instance (`flow/on-test-instance`). | **Review** automation (from `flow/ready-to-review` when there are no suggestions)                                                                     |
| `flow/merge-accepted`        | Human accepted the merge; it just needs to land (rebase if needed, then merge).                                                                                                                                    | Human (from `flow/ready-to-merge`, or from `flow/on-test-instance` once pre-merge testing passes)                                                     |
| `flow/ready-to-test`         | Merged to `main`; the merged result is awaiting QA verification, after which the issue is closed.                                                                                                                  | **Merge** automation (after the PR lands — except RN-only changes), or human (from `flow/waiting-for-app-build` once the app build ships)             |
| `flow/waiting-for-app-build` | Merged to `main`, but the PR changed **only** `platform/rn-components`; the change is not verifiable until the native app is rebuilt with the new code.                                                            | **Merge** automation (post-merge, RN-only changes)                                                                                                    |
| `flow/on-test-instance`      | Pre-merge: the PR is being verified on the test instance before the merge is accepted.                                                                                                                             | Human (from `flow/ready-to-merge`)                                                                                                                    |

The pipeline, with the **human-only** transitions marked:

```
[New]
  │  intake (auto)
  ▼
flow/needs-specs ──human──► flow/ready-to-schedule
                                  │  human (schedule)
                                  ▼
                          flow/ready-to-plan
                                  │  planning (auto)
                                  ▼
                     flow/ready-to-review-plan ◄─────┐
                                  │  human (approve plan)    │ (plan-level or
                                  ▼                          │  functional change)
                          flow/ready-to-implement ◄──────────┤ (test/doc/quality/
                                  │  implementation (auto)   │  dependency-only
                                  ▼                          │  suggestions)
                          flow/ready-to-review ──────────────┤
                                  │  review (auto)           │
                                  ▼                          │
                          ┌───────┴────────┐                 │
                          ▼ (no suggestions) ▼ (suggestions)──┘
                     flow/ready-to-merge
                          │
                          ├────────human (accept)─────────────┐
                          │                                    │
                          └──human (test it first)──► flow/on-test-instance
                                                              │  human (verified)
                                                              ▼
                     flow/merge-accepted ◄────────────────────┘
                          │  rebase (auto, if the PR is behind main)
                          │  merge  (auto, once it is mergeable)
                          │
                          ├─ RN-only change (auto) ─► flow/waiting-for-app-build
                          │                               │  human (app build shipped)
                          ▼                               ▼
                     flow/ready-to-test ◄────────────────┘
                          │
                          └─ human closes the issue once QA on main confirms it
```

The loops:

- **Re-plan loop:** `flow/ready-to-review` → (review posts a numbered list of
  suggestions) → `flow/ready-to-review-plan` → human approves →
  `flow/ready-to-implement` → `flow/ready-to-review`. Implementation must
  address the latest plan and the numbered review suggestions from that loop.
  This is the path whenever any suggestion changes the plan or behavior
  (functional, architecture, or product-level).
- **Fast rework loop (test/doc/quality/dependency-only):** if **every**
  suggestion in the review round is one of:

  - **Test** — adding, fixing, or strengthening tests for the change,
  - **Doc** — comments, AGENTS.md/docs text, PR or commit messages,
  - **Quality** — style, naming, lint/prettier, typecheck hygiene, dead code,
    small refactors that do not change behavior, convention alignment,
  - **Dependency** — lockfile/manifest hygiene, version bumps, pinning,
    package-gate issues,

  then the Review automation moves the issue straight to
  `flow/ready-to-implement` — the human re-sign step is skipped, because the
  suggestions cannot alter what was agreed to be built, only how it is
  delivered. The Review automation names in its comment why the re-sign step
  was skipped (all suggestions in one of the four classes). If even one
  suggestion is outside these classes, the issue takes the normal re-plan
  loop instead.

- **Pre-merge test loop (one branch of the `flow/ready-to-merge` fork):**
  `flow/ready-to-merge` → human routes it to `flow/on-test-instance` →
  verified, the human moves it to `flow/merge-accepted`; or a defect is found
  and the human sends it back to `flow/ready-to-implement` to fix and
  re-review. The other branch of the fork is the direct
  `flow/ready-to-merge` → `flow/merge-accepted` acceptance.
- **App-build loop (post-merge):** a merged PR that changed **only**
  `platform/rn-components` is labeled `flow/waiting-for-app-build` (its change
  is not verifiable until the native app is rebuilt with it); once the app
  build ships, the human moves the issue to `flow/ready-to-test`.
- **CI-fix loop (any automation that pushes commits — Implementation,
  Rebase, Merge):** a run never finishes while the PR's CI is red. After
  pushing, the run checks the CI of the pushed head and, for every failing
  job, reads that job's log, root-causes it, and does another fixing round
  (fix → push → check again) until CI is green. Only a failure the branch
  cannot fix (e.g. CI infrastructure that never comes up) ends the run
  without green CI — and then only with a comment naming the job, its log
  signature, and why it is not branch-fixable; when unsure, re-run the
  failing job first (a few retries distinguish a flake from a real failure).
  A run whose fix changed code still leaves the issue at the run's normal
  destination — the review picks up the refreshed PR as usual.

### Who moves an issue where

**Automations** (each works only from its own queue — see
[Automation principles](#automation-principles)):

| Automation | Queue (input) | Work | Destination |
| ---------- | ------------- | ---- | ----------- |

| **Intake** | new issues with no `flow/*` label and no referencing PR | Analyze clarity/complexity/impact/security | `flow/needs-specs` (unclear) or `flow/ready-to-schedule` (clear) |
| **Planning** | `flow/ready-to-plan` | Write a clear implementation plan (simplest architecture, trade-offs named) in a comment on the issue that starts with `## Implementation plan` | `flow/ready-to-review-plan` |
| **Implementation** | `flow/ready-to-implement` | Implement the latest `## Implementation plan` comment (or address the newest numbered review suggestions / test report posted after it); keep exactly one open PR for the issue; leave the PR with **CI green** — a red job means another fixing round, not a finished run (CI-fix loop) | `flow/ready-to-review` |
| **Review** | `flow/ready-to-review` | Critically review the PR in the context of the whole repo; if there are suggestions, post them as a **numbered list** (one list, no categories) on the issue. **Never flag a PR for being behind `main` / not rebased** — keeping the PR current is the separate **Rebase** automation's job (post-merge), not a review finding or an implementation defect. | `flow/ready-to-review-plan` (any suggestion is functional / changes the plan or behavior), `flow/ready-to-implement` (every suggestion is test/doc/quality/dependency — see the fast rework loop), **or** `flow/ready-to-merge` (no suggestions) |
| **Rebase** | `flow/merge-accepted` (the PR is behind `main`) | Rebase the PR onto `main`, resolve conflicts, then **recompute and apply version bumps** for the packages the (possibly conflict-resolved) diff changes, per the `check-openpeeps-pr-readiness` decision table (minor for `feat:`, none for `fix:` without new API surface, never private packages) | leave `flow/merge-accepted`; if conflict resolution changed behavior → `flow/ready-to-review` |
| **Merge** | `flow/merge-accepted` (the PR is mergeable: not behind `main`, CI green) | Merge the PR fast-forward; if the PR changed **only** `platform/rn-components` files the issue goes to `flow/waiting-for-app-build`, otherwise to `flow/ready-to-test` | remove `flow/merge-accepted`, add `flow/ready-to-test` (or `flow/waiting-for-app-build` for RN-only changes); do **not** close the issue |

**Humans** are the only ones who may move an issue:

- `flow/needs-specs` → `flow/ready-to-schedule` (questions answered)
- `flow/ready-to-schedule` → `flow/ready-to-plan` (scheduled)
- `flow/ready-to-review-plan` → `flow/ready-to-implement` (plan approved)
- `flow/ready-to-merge` → `flow/merge-accepted` (merge accepted) — **one
  branch of the fork**: the human accepts the merge straight away
- `flow/ready-to-merge` → `flow/on-test-instance` (verify the PR on the test
  instance before accepting the merge) — **the other branch of the fork**:
  the human decides the PR must be verified on the test instance first
- `flow/on-test-instance` → `flow/merge-accepted` (verified on the test
  instance)
- `flow/on-test-instance` → `flow/ready-to-implement` (verification found a
  defect to fix and re-review)
- `flow/waiting-for-app-build` → `flow/ready-to-test` (the app build with the
  RN change has shipped; it is now testable)

`flow/ready-to-merge` is a bona fide fork, not two sequential gates: exactly
one of the two branches is taken, and the choice is the human's call.

**Agent profiles:** Intake runs as **OpenPeeps Triage Assistant** (`fast`
model), Review runs as **OpenPeeps Reviewer** (`review` model); Planning,
Implementation, Rebase and Merge all run as **OpenPeeps Coder** (`think`
model).

An automation must never make a human-only transition, and a human-only
transition is never automated.

### In-progress protocol (claiming)

To stop two automations working on the same issue, an issue can also carry the
plain `in-progress` label alongside its one flow stage label.

1. **Select only unclaimed issues.** A candidate must carry its queue's stage
   label and **not** carry `in-progress`.
2. **Claim immediately.** As soon as an issue is selected, add `in-progress`
   (`POST …/issues/{n}/labels`, body `{"labels": ["in-progress"]}`), then
   `GET` the issue and verify `in-progress` is present **and** the stage label
   is still there. If a concurrent run took it, drop it and pick the next
   candidate.
3. **Release on completion.** After the final stage-label change (or merge),
   remove `in-progress` (`DELETE …/issues/{n}/labels/in-progress`). Never end a
   finished run with `in-progress` still on the issue.

`in-progress` is a claim marker only — it is not a flow stage and never counts
toward "exactly one flow label". A separate **Stale In-Progress Cleanup**
automation removes `in-progress` from issues that have had no activity for over
an hour, so an issue abandoned by a crashed run becomes claimable again.

**Forgejo label API gotchas** (apply to every label operation above): the
label-add endpoint is ADDITIVE (it appends to the label set, it does not
replace it); remove labels by NAME, not by id (delete by id returns 422); the
delete call can return 204 or 404 on success — always GET the issue afterwards
and verify the final label set.

### Automation principles (apply to every flow automation)

1. **Claim before you work.** Follow the [In-progress
   protocol](#in-progress-protocol-claiming) so two jobs never work the same
   issue.
2. **Issues, not PRs.** All flow stage labels and comments are applied to the
   **issue**, never to the PR. A PR is acted on only as part of handling the
   issue that references it. (The `in-progress` claim label is on the issue too.)
3. **Say what you did and why.** Every run that handles an issue must leave at
   least a terse comment on the issue stating what it was doing in that run
   (e.g. "wrote the implementation plan", "reviewed the PR and posted 4
   suggestions", "merged the PR") — not just why the issue was selected. The
   comment also states which automation handled it, via the footer:
   `— Handled by the <AUTOMATION NAME> automation: <one short sentence on why
this issue was selected>.` If the run already posts a substantive comment on
   the issue, that note and the footer go in the same comment, not a second
   one. A run that handled no issue posts no comment.
4. **Strict queues.** An automation works **only** on issues that carry exactly
   its own stage label. An issue with a different label, no label, or multiple
   labels is out of scope — skip it (and name it in the run summary if you
   skipped any). If no eligible issue exists, the run makes **zero changes**
   (no comments, no label changes, no PR operations) and ends.
5. **Explain every label change.** Whenever a run adds or removes a label on
   the issue — a flow stage move, or the `in-progress` claim and its release —
   it says so in the comment it leaves: which label it added or removed, and
   why (e.g. "moved `flow/ready-to-plan` → `flow/ready-to-review-plan` — plan
   written"). A run that makes a label change without a comment explaining it
   has not finished its work on that issue. When the Review automation skips
   the human re-sign step via the fast rework loop, that comment must say so
   explicitly (all suggestions test/doc/quality/dependency-only) so the human
   can veto it and move the issue back to `flow/ready-to-review-plan`.

### Retired / not used

These former labels are no longer part of the flow; do not (re)apply them:

- `flow/ready-to-rework` — rework is expressed by the re-plan loop (review →
  `flow/ready-to-review-plan` → human → `flow/ready-to-implement`) or, for
  test/doc/quality/dependency-only suggestion rounds, the fast rework loop
  (review → `flow/ready-to-implement` directly).
- `flow/ready-to-replan` — folded into the re-plan loop (a re-plan is just a
  pass through `flow/ready-to-review-plan`).

## Git & PRs

- Only commit when explicitly asked.
- Don't force-push shared branches or amend pushed commits unless asked.
- **One PR per fix.** Each pull request should address a single issue or concern. Do not combine multiple unrelated fixes in a single PR — open separate PRs instead.
- Before opening a PR, follow the `check-openpeeps-pr-readiness` skill.

### Commit workflow

When finalizing a branch for PR:

1. **Rebase** onto latest `main`:
   ```bash
   rtk git fetch origin main && rtk git rebase origin/main
   ```
2. **Squash** all branch commits into one using the squash script:
   ```bash
   bash scripts/squash-branch.sh --ci -m "feat(scope): description"
   ```
   Requires a clean working tree. Commit or stash changes first.
3. **Sign** the commit with your configured git author (from `git config
user.name`/`user.email`; do not hardcode an author here):

   ```bash
   rtk git commit --amend \
     -m "feat(scope): description

   Signed-off-by: Your Name <you@example.com>"
   ```

4. **Push** with force-with-lease:
   ```bash
   rtk git fetch origin <branch> && rtk git push --force-with-lease origin <branch>
   ```
   Always fetch before pushing to avoid stale ref errors.

## Agent Working Rules

### Path Discipline

- Copy file paths and directory names VERBATIM from tool results in context.
  Never abbreviate, pluralize, hyphenate, or reconstruct paths from memory.
- Before any edit to a file, read the file (or at minimum its directory
  listing) in the current session. Do not edit paths you haven't seen in
  tool output.
- If a path is not in context, find it with search/listing tools first.
  Guessing is never acceptable.
- On any tool error indicating a missing file or path, STOP and re-locate
  the correct path. Never retry the same path unmodified.

### Context Economy

- Truncate verbose command output. For test suites, builds, and logs,
  report only the summary and relevant excerpts, not full output.
- Never paste an entire file into your response. Reference the path and
  line range instead.
- Prefer targeted searches over reading whole files when locating code.

### Terminal Discipline

- Bound every foreground command so it is safe to abort at ~30s: use the
  terminal tool's `timeout` parameter for anything that can block (network,
  install, build, test, database), and add `--max-time 15` to `curl`
  (`--timeout=15` to `wget`) in every network call. Genuinely long
  operations run in the background with output to a log file, and you poll
  the log — never the process.
- Never poll a hung command. If a command hits the no-output notice, at
  most one empty-command send is allowed; if it is still silent, send `C-c`
  (or kill the PID), treat the command as failed, and change approach. A
  process with no new output for ~30s is broken, not slow. Repeating the
  same action after an identical no-op observation is how runs get killed
  as stuck.
- Errors must stay visible. Never `2>/dev/null` on a network or API call —
  a hidden error is the most expensive failure mode in a non-interactive
  run. On a visible API failure, retry once; if it still fails, skip that
  check, note it, and continue. An informational lookup (CI status, a log
  excerpt, a version check) must never block the actual task.

### Working Style

- Before a cross-cutting change, state the full list of affected files and
  get confirmation, then work through the list systematically, verifying
  each edit succeeded before proceeding.
- Prefer the smallest diff that accomplishes the task.
- One concern per edit. Never bundle unrelated changes.

### Verification

- After each edit to a file in a series of related edits, verify the edit
  landed (read the modified region back) before moving to the next file.
- Run the project's checks/tests before declaring a task complete.
  Report which checks passed and which failed.
