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

### Code quality

For each `@openpeeps/<pkg>` you touched under `platform/` or `libraries/`:

- [ ] `pnpm --filter @openpeeps/<pkg> build` — succeeds
- [ ] `pnpm --filter @openpeeps/<pkg> lint` — succeeds
- [ ] `pnpm --filter @openpeeps/<pkg> test` — if the package has tests

Discover touched paths from the diff:

```bash
git diff main --name-only | cut -d/ -f1-2 | sort -u
```

Map paths to packages via each directory's `package.json` `name` field (e.g.
`platform/server` → `@openpeeps/server`, `libraries/greenscreen` → check
`package.json`).

### Pre-commit hooks (if lefthook installed)

On commit, lefthook runs:

- `node scripts/generate-changelog.mjs`
- Prettier on staged `*.{ts,tsx}`

Commit `CHANGELOG.md` if the hook regenerated it. This is separate from
`check-branch.mjs` (which does not validate the changelog).

### CI parity (recommended before non-trivial PRs)

CI also builds a Docker image and runs Playwright integration tests:

```bash
pnpm --filter @openpeeps/tests test:integration
```

Run this for API, UI, or cross-cutting changes.

### PR description

- [ ] PR title matches the conventional commit subject
- [ ] If the change touches **>3 files OR >6 lines**, the body includes the
  change outline from `AGENTS.md` (Explaining your changes)
- [ ] Issue references use `References #N` — not `Fixes #`, `Closes #`, or
  `Resolves #` (avoids auto-closing issues)
- [ ] No merge conflicts with `main`

## Report Format

```markdown
## PR readiness: [PASS | FAIL]

### Git checks
- Local main aligned with origin: [yes/no]
- Commits ahead of main: N (expected 1)
- check-branch.mjs: [pass/fail]

### Packages checked
- @openpeeps/…: build [pass/fail], lint [pass/fail]

### Blockers
- [list anything that must be fixed]
```

## Fixing Common Failures

| Failure | Fix |
|---------|-----|
| `could not compare to main` | `git fetch origin && git branch -f main origin/main` |
| N commits ahead of main (N ≠ 1) | `./scripts/squash-branch.sh` with clean tree |
| Non-conventional commit subject | Re-squash or amend (unpushed only) with `type(scope): description` |
| Lint errors | `pnpm --filter @openpeeps/<pkg> format` then re-run lint |
| Build errors after editing a library | Rebuild chain: `common` → `core` → dependents |
| Branch behind main | `git fetch origin && git branch -f main origin/main && git rebase main` |

## What CI Runs

On push (`.forgejo/workflows/build.yaml`), for feature branches:

1. Build and push Docker image
2. Run Playwright integration tests against that image
3. Tag/deploy image (`deploy-docker`)
4. Run `node scripts/check-branch.mjs` (`commit-check` job; skipped on
   `main`, `staging`, `stable`, and `weblate`)

Your local `node scripts/check-branch.mjs` run mirrors step 4.
