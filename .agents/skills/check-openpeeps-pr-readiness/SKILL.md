---
name: check-openpeeps-pr-readiness
description: >-
  Validate OpenPeeps changes meet PR prerequisites before opening a pull
  request on code.openpeeps.org/openpeeps/openpeeps. Use when preparing a PR,
  checking branch readiness, squashing commits, verifying conventional commit
  format, or before asking the user to open a draft PR.
---

# Check OpenPeeps PR Readiness

**Type:** Rigid for git/CI gates; flexible for which package lint/build commands to run based on the diff.

Run this **before** opening a PR. CI enforces the git gates via `scripts/check-branch.mjs`.

Policy sources: `scripts/check-branch.mjs`, `scripts/squash-branch.sh`,
`.forgejo/workflows/build.yaml`, and `AGENTS.md` (Explaining your changes).

## When to Use

- User asks "is this ready for a PR?" or "check my branch"
- Before creating a draft PR on code.openpeeps.org
- After finishing a feature branch, before push

## Quick Gate

From repo root:

```bash
git fetch origin
git branch -f main origin/main   # align local main with remote (CI does this)
git rebase main                  # branch must be up to date before merge
node scripts/check-branch.mjs    # must print "All checks passed."
```

`scripts/check-branch.mjs` compares `HEAD` to the **local `main` branch** — not
`origin/main` directly. Update local `main` from the remote before rebasing and
running the check (same as CI's `git branch main origin/main` step).

The script verifies:

1. Exactly **one commit** ahead of `main`
2. Last commit **subject** matches conventional format: `type(scope): description`
   (scope is optional; e.g. `feat(api): add endpoint` or `fix: typo`)

It does **not** verify rebase status, a clean working tree, build/lint, or
`CHANGELOG.md`.

If you have multiple commits, squash with a **clean working tree**:

```bash
./scripts/squash-branch.sh
```

Edit the commit message in your editor to conventional format, then re-run
`node scripts/check-branch.mjs`.

## Checklist

### Git — CI-enforced (`check-branch.mjs`)

- [ ] Local `main` matches remote: `git fetch origin && git branch -f main origin/main`
- [ ] Branch rebased on `main`: `git rebase main`
- [ ] Exactly one commit ahead: `git rev-list --count main..HEAD` → `1`
- [ ] Conventional commit subject on that commit
- [ ] `node scripts/check-branch.mjs` exits 0

### Git — before squash / push

- [ ] Working tree clean (`git status`) before running `./scripts/squash-branch.sh`
- [ ] Branch addresses **one** fix/issue — no unrelated changes bundled in

### Code quality

For each `@openpeepshq/<pkg>` you touched under `platform/` or `libraries/`:

- [ ] `pnpm --filter @openpeepshq/<pkg> build` — succeeds
- [ ] `pnpm --filter @openpeepshq/<pkg> lint` — succeeds
- [ ] `pnpm --filter @openpeepshq/<pkg> test` — if the package has tests
- [ ] Version bumps follow the decision table below (§4)

Discover touched paths from the diff:

```bash
git diff main --name-only | cut -d/ -f1-2 | sort -u
```

Map paths to packages via each directory's `package.json` `name` field (e.g.
`platform/server` → `@openpeepshq/server`, `libraries/greenscreen` → check
`package.json`).

## Verifying the implementation round (before pushing)

Mandatory final step of every implementation run — including re-implementation
runs that address numbered review suggestions. It mirrors what CI runs, so
review rounds do not have to repeat CI findings. **Run every gate on the
final head** (after the last squash), not on an intermediate state, and never
report a gate as passed based on a narrower run (per-package, partial file
list, previous head).

### 1. CI-parity gates (the exact commands from `.forgejo/workflows/build.yaml`)

| Gate | Command | Catches |
| --- | --- | --- |
| Prettier (repo-wide) | `pnpm exec prettier --check .` | Formatting drift in any touched file — run at repo root; CI is not scoped per-package |
| ESLint | `pnpm run -r lint`, or `pnpm --filter <pkg> lint` per touched package | Lint errors in touched code |
| Typecheck | `pnpm --filter <pkg> typecheck` for every touched package **and its direct dependents** (build `common` → `core` → `react` first — dependents resolve types from `dist/`, which also typechecks the test files a `vitest` run would skip) | Build-breaking imports, wrong API shapes, stale test call shapes |
| Tests | `pnpm --filter <pkg> test:run` (or `exec vitest run` / `exec jest` per package) | Behavior + the regression tests the plan promised |
| i18n parity | `node scripts/check-i18n-parity.mjs --strict` | Missing en↔de keys (the CI `i18n-check` job) |
| i18n usage | `node scripts/i18n-usage-scan.mjs --strict --diff main` | `t('…')` keys your diff introduced that do not exist in en.json (the missing-key-without-defaultValue class) |
| Frozen lockfile | `pnpm install --frozen-lockfile` (any PR touching `package.json` / `pnpm-workspace.yaml`) | Lockfile regenerated from a dirty/stale tree (step 1 of the CI lint job) |
| Branch shape | `node scripts/check-branch.mjs` **after** the final squash | Single commit ahead of main, conventional subject |
| References | `node scripts/check-pr-references.mjs` | `Fixes #N` / `Closes #N` / `Resolves #N` in the commit message (auto-close) |

A verification claim you cannot re-derive from captured command output is a
review finding: record the command and its result in the implementation
comment, not just "tests pass".

### 2. Plan-conformance matrix (build it in the implementation comment)

Every numbered step of the latest approved `## Implementation plan` maps to
evidence:

| Plan step | Status | Evidence (file / named test / command output) |
| --- | --- | --- |
| 1. … | done | `platform/…/foo.ts`; test `bar.test.ts` |
| 2. … | deferred | real dependency + which run lands it |

Rules:

- **Every test the plan names exists in the diff.** A deferral is only valid
  with a dependency that checks out (e.g. "needs #1939"). "CI tooling not
  available yet" fails the check if the workflow file runs vitest for that
  package.
- **Regression tests must fail on the unfixed code.** For a bug fix, run the
  new test once against the pre-fix file (scratch worktree with the
  merge-base version, or temporarily `git stash` the fix hunk) and confirm it
  **fails**; then confirm it passes with the fix. A test that passes on both
  cannot catch the regression it exists for.
- **New modules must be wired.** Grep for each new export's call sites in the
  real entry files (`platform/server/src/server.ts`,
  `platform/worker/src/index.ts`). Zero hits means dead code behind a config
  flag — that is not an implementation.
- **Schema reads ship their migration.** Every new column/table the diff
  reads needs a `db:generate`d file under `platform/core/src/db/pg/sql/` in
  the same PR.
- **Scope equals plan scope.** Files/endpoints outside the plan's named
  boundary are dropped (or the plan re-signed) — silently adding them is a
  review finding.
- **Doc comments:** update every doc comment that justified the old behavior
  you removed, and never add line-number references to JSDoc (they rot on the
  next refactor). Reverse-grep the superseded rationale (old status codes,
  old versions, removed function names) and fix the hits.

### 3. Claims audit (PR body + commit body)

- Every factual claim — test counts, `pnpm audit` numbers, "tsc clean",
  behavioral statements — is re-run on the final head and the output is
  recorded. Audit numbers come from `pnpm audit` on this head, never carried
  over from the plan or a previous head.
- Every commit-body bullet maps to files present in
  `git diff origin/main...HEAD`. A bullet describing a change that is not in
  the diff is removed or the change is made.
- Acceptance claims are as narrow as the change ("guards the calendar path" —
  not "list and calendar on web and native" unless both paths are guarded).

### 4. Version bumps (decision table)

- **Never** bump private packages (`platform/server`, `platform/web` are
  `"private": true`) or any package the diff does not change.
- `feat:` → **minor** bump in every touched *published* package
  (`common`, `core`, `client`, `react`, `rn-components`, `i18n`,
  `fetch-client`, `greenscreen`, `react-ui`, `worker`). Bump `i18n` only when
  locale content changed.
- `fix:` with **no new API surface** → **no bump**. Sibling open PRs on the
  same package otherwise conflict on `package.json` and merge order decides
  the published version; the number is release-coordination's job.
- Before bumping, check open sibling PRs touching the same `package.json`
  and align on one target version.
- The `publish-gate` job re-runs `node scripts/check-publish-gate.mjs
  --package <p>` for each bumped published package — run it locally for each
  bumped package before pushing.

### 5. Hygiene checks

- [ ] Issue references use `References #N` only — run
      `node scripts/check-pr-references.mjs --file <pr-body>` on the PR body
      too (the CI gate only sees commit messages).
- [ ] No `flow/*` labels on the PR (they belong on the issue): `GET
      /repos/…/pulls/{n}`, delete any `flow/*` label.
- [ ] Single commit: `bash scripts/squash-branch.sh -m "<subject>"`,
      force-push, then `node scripts/check-branch.mjs`.
- [ ] Commit subject uses a changelog type from
      `scripts/generate-changelog.mjs` (`feat`, `fix`, `chore`, `docs`,
      `refactor`, `test`, `perf`, `build`, `ci`, `style`). `commit-check`
      validates the shape only — an unknown type like `federation: …` passes
      CI but silently drops the CHANGELOG entry.
- [ ] web/RN mirror: when the diff changes a filter, predicate, validator or
      formatter, grep the sibling implementation on the other side of the
      boundary (`core` SQL ↔ `common`/`react`/`rn-components` JS;
      `platform/react` ↔ `platform/rn-components`) and either align it or
      record "intentionally divergent, because …" — plus one test per side
      pinning the shared semantics.
- [ ] i18n: every new user-facing string lands in **both** `en.json` and
      `de.json` in the same commit (the strict parity gate blocks otherwise).

**Out of scope for the implementation round:** keeping the branch rebased for
the rest of its life. Rebase onto current `main` *before* the final squash,
then leave it. After `flow/merge-accepted`, the separate **Rebase** automation
keeps the PR current, so "behind main" is never a defect to chase during
implementation (and never a review finding either).

### Pre-commit hooks (if lefthook installed)

On commit, lefthook runs:

- `node scripts/generate-changelog.mjs`
- Prettier on staged `*.{ts,tsx}`

Commit `CHANGELOG.md` if the hook regenerated it. This is separate from
`check-branch.mjs` (which does not validate the changelog).

### CI parity (recommended before non-trivial PRs)

CI also builds a Docker image and runs Playwright integration tests:

```bash
pnpm --filter @openpeepshq/tests test:integration
```

Run this for API, UI, or cross-cutting changes.

### PR description

- [ ] PR title matches the conventional commit subject
- [ ] If the change touches **>3 files OR >6 lines**, the body includes the
      change outline from `AGENTS.md` (Explaining your changes)
- [ ] Issue references use `References #N` — not `Fixes #`, `Closes #`, or
      `Resolves #` (avoids auto-closing issues)
- [ ] No merge conflicts with `main`
- [ ] PR addresses a **single** issue/concern (if multiple fixes are needed, open separate PRs)

## Report Format

```markdown
## PR readiness: [PASS | FAIL]

### Git checks

- Local main aligned with origin: [yes/no]
- Commits ahead of main: N (expected 1)
- check-branch.mjs: [pass/fail]

### Packages checked

- @openpeepshq/…: build [pass/fail], lint [pass/fail], version bumped [yes/no]

### Blockers

- [list anything that must be fixed]
```

## Fixing Common Failures

| Failure                              | Fix                                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------------------- |
| `could not compare to main`          | `git fetch origin && git branch -f main origin/main`                                |
| N commits ahead of main (N ≠ 1)      | `./scripts/squash-branch.sh` with clean tree                                        |
| Non-conventional commit subject      | Re-squash or amend (unpushed only) with `type(scope): description`                  |
| Auto-close keyword in commit/PR body | Replace `Fixes #N` / `Closes #N` / `Resolves #N` with `References #N`; re-run `node scripts/check-pr-references.mjs` |
| Lint errors                          | `pnpm --filter @openpeepshq/<pkg> format` then re-run lint                          |
| Version bumps wrong                  | Apply the decision table (§4): feat → minor in touched published packages; fix without new API → no bump; never private packages |
| Build errors after editing a library | Rebuild chain: `common` → `core` → dependents                                       |
| Branch behind main                   | `git fetch origin && git branch -f main origin/main && git rebase main` (before the final squash only) |

## What CI Runs

On push (`.forgejo/workflows/build.yaml`), for feature branches:

1. Build and push Docker image
2. Run Playwright integration tests against that image
3. Tag/deploy image (`deploy-docker`)
4. Run `node scripts/check-branch.mjs` and `node scripts/check-pr-references.mjs`
   (`commit-check` job; skipped on `main`, `staging`, `stable`, and `weblate`)
5. `i18n-check`: `node scripts/check-i18n-parity.mjs --strict` (en↔de parity)
6. `lint`: `pnpm install --frozen-lockfile` → `pnpm exec prettier --check .`
   → `pnpm run -r lint`
7. `publish-gate`: `node scripts/check-publish-gate.mjs --package <p>` for
   every published package whose `package.json` version changed

Your local runs of `check-branch.mjs`, `check-pr-references.mjs`, the
i18n scripts, `prettier --check .`, the per-package typechecks and
`pnpm install --frozen-lockfile` mirror steps 4–7 (see
[Verifying the implementation round](#verifying-the-implementation-round-before-pushing)).
