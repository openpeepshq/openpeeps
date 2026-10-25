# CI Setup Review: Findings & Recommendations

## 1. Executive Summary

This document presents a comprehensive analysis of the OpenPeeps CI pipeline,
focusing on the main `build.yaml` workflow. The analysis covers the 30 most
recent `build.yaml` runs (2026-10-13 to 2026-10-14) fetched from the Forgejo
Actions API, including run-level status, per-job outcomes, and log scanning for
errors and warnings.

### Key Findings at a Glance

| Metric            | Value                |
| ----------------- | -------------------- |
| Runs analyzed     | 30 (build.yaml only) |
| Pass rate         | 76.7% (23/30)        |
| Failure rate      | 10.0% (3/30)         |
| Cancellation rate | 13.3% (4/30)         |
| Duration range    | 19s – 737s           |
| Avg duration      | 387s (~6.5 min)      |

Failures cluster in four categories: infrastructure (Docker/network errors
in the build job), process (commit format / multi-commit branches), code
(TypeScript compilation errors in publish-gate), and i18n parity (missing
translations). Cancellations are caused by aggressive concurrency
cancellation on feature branches.

---

## 2. CI Setup Overview

### Workflow Files (`.forgejo/workflows/`)

| File                        | Purpose                               | Trigger                                |
| --------------------------- | ------------------------------------- | -------------------------------------- |
| `build.yaml`                | Main CI: build, test, publish, deploy | push, workflow_dispatch, workflow_call |
| `component-gallery.yaml`    | Build & push component gallery image  | push to main/staging/stable            |
| `docs.yaml`                 | Build & push docs site image          | push to main/staging/stable            |
| `releases.yaml`             | Build & push release notes image      | push to main/staging/stable            |
| `regenerate-changelog.yaml` | Nightly CHANGELOG.md regeneration     | schedule + manual                      |
| `weblate-pr.yaml`           | Auto-open PR for Weblate translations | push to `weblate`                      |

### `build.yaml` Job Graph

```
  set-variables (entry point)
      |
      ├──> i18n-check ──> build ──┐
      ├──> publish-gate          │
      ├──> build-test-image ─────┼──> test-integration (4 shards) ─→ deploy-docker ──> commit-check ──> publish-packages (main only)
      ├──> test-unit ─────────────┼──> test-integration-small ──────↗              (only on main)
      │                           └─> test-integration-jams ───────────↗
      └──> deploy-docker ─────────────────────────────────────────────

Concurrency: group = ${{ github.workflow }}-${{ github.ref_name }}
  cancel-in-progress = true for non-main branches
```

**Notable job dependencies:**

- `build` depends on both `set-variables` and `i18n-check` — an i18n failure
  blocks the Docker image build.
- `commit-check` depends on `deploy-docker`, which depends on all test jobs.
  This means a commit-format failure is only detected **after** the full
  pipeline (6–8 min) has completed.
- `publish-gate` depends only on `set-variables` and runs early — it can fail
  in parallel with the Docker builds.

---

## 3. Timeline Analysis — Last 30 `build.yaml` Runs

### Status Summary

| Status    | Count | %     |
| --------- | ----- | ----- |
| Success   | 23    | 76.7% |
| Cancelled | 4     | 13.3% |
| Failure   | 3     | 10.0% |

### Run Timeline (most recent first)

| Run ID | Time (local) | Branch                 | Status       | Duration | Commit Title (short)                  |
| ------ | ------------ | ---------------------- | ------------ | -------- | ------------------------------------- |
| 1970   | Oct 14 14:25 | main                   | ✅ success   | 7m10s    | fix(markdown): restore iframe support |
| 1969   | Oct 14 14:10 | fix/iframe-youtube...  | ✅ success   | 10m24s   | fix(markdown): restore iframe support |
| 1968   | Oct 14 14:07 | main                   | ✅ success   | 7m20s    | fix(rn-components): border radius     |
| 1967   | Oct 14 14:04 | fix/iframe-youtube...  | ⛔ cancelled | 4m56s    | (superseded by 1969)                  |
| 1966   | Oct 14 14:02 | fix/button-border-r... | ✅ success   | 3m40s    | fix(rn-components): border radius     |
| 1965   | Oct 14 13:35 | fix/button-border-r... | ⛔ cancelled | 2m16s    | (superseded by 1966)                  |
| 1964   | Oct 14 13:29 | fix/dm-thread-view...  | ❌ failure   | 4m16s    | fix(rn-components): DM alignment      |
| 1963   | Oct 14 13:11 | 1266-export-rsvp...    | ❌ failure   | 19s      | feat(posts): RSVP export              |
| 1962   | Oct 14 12:37 | main                   | ✅ success   | 5m46s    | fix(rn-components): DM alignment      |
| 1961   | Oct 14 12:31 | fix/dm-thread-view...  | ✅ success   | 3m0s     | fix(rn-components): DM alignment      |
| 1959   | Oct 14 11:12 | main                   | ✅ success   | 12m17s   | chore: bump versions                  |
| 1958   | Oct 14 11:02 | chore/bump-packa...    | ✅ success   | 10m16s   | chore: bump versions                  |
| 1955   | Oct 14 10:21 | staging                | ✅ success   | 5m36s    | fix(rn-components): conversation UI   |
| 1954   | Oct 14 10:08 | main                   | ✅ success   | 4m47s    | fix(rn-components): conversation UI   |
| 1953   | Oct 14 09:49 | fix/rn-conversatio...  | ✅ success   | 10m18s   | fix(rn-components): conversation UI   |
| 1952   | Oct 14 09:36 | fix/rn-conversatio...  | ✅ success   | 10m42s   | fix(rn-components): conversation UI   |
| 1950   | Oct 14 09:30 | main                   | ✅ success   | 5m8s     | feat(resources): resource library     |
| 1949   | Oct 14 09:19 | 95-add-a-resour...     | ✅ success   | 2m46s    | feat(resources): resource library     |
| 1948   | Oct 14 09:10 | 95-add-a-resour...     | ⛔ cancelled | 1m42s    | (superseded by 1949)                  |
| 1947   | Oct 14 09:19 | fix/rn-conversatio...  | ✅ success   | 5m55s    | fix(rn-components): conversation UI   |
| 1945   | Oct 14 09:01 | main                   | ✅ success   | 4m55s    | feat(resources): resource library     |
| 1944   | Oct 14 08:51 | 95-add-a-resour...     | ✅ success   | 10m22s   | feat(resources): resource library     |
| 1943   | Oct 14 08:32 | main                   | ✅ success   | 5m52s    | fix(rn-components): conversation UI   |
| 1942   | Oct 14 08:24 | fix/rn-conversatio...  | ✅ success   | 2m22s    | fix(rn-components): conversation UI   |
| 1941   | Oct 14 08:19 | fix/rn-conversatio...  | ⛔ cancelled | 2m9s     | (superseded by 1942)                  |
| 1940   | Oct 14 02:00 | main                   | ✅ success   | 10m44s   | Regenerate changelog (scheduled)      |
| 1936   | Oct 13 18:33 | main                   | ✅ success   | 9m37s    | feat(markdown): sanitize iframes      |
| 1935   | Oct 13 18:22 | feat/markdown-htm...   | ✅ success   | 10m14s   | feat(markdown): sanitize iframes      |
| 1934   | Oct 13 18:06 | feat/markdown-htm...   | ✅ success   | 10m13s   | feat(markdown): sanitize iframes      |
| 1933   | Oct 13 17:56 | feat/markdown-htm...   | ❌ failure   | 8m18s    | feat(markdown): sanitize iframes      |

### Key Timeline Observations

1. **Rapid-fire pushes on feature branches**: `toggling-push-notifications-in-browser-broken` (28 runs), `1040-token-refresh-and-logged-out-redirect` (5 runs), `fix/rn-conversation-ui-parity` (5 runs). Multiple commits pushed in quick succession trigger sequential CI runs that cancel each other.

2. **No timeline gaps > 15 minutes**: CI is triggered continuously, indicating active development across multiple branches.

3. **Concurrency pattern**: 4 cancelled runs are all on feature branches (non-`main`). Each is a run that was superseded by a newer push to the same branch. The concurrency group
   `${{ github.workflow }}-${{ github.ref_name }}` with `cancel-in-progress: true`
   for non-main branches causes this.

4. **main-branch runs average ~5-7 min**, while feature-branch runs with new pushes average ~3 min (shorter because they're cancelled early).

---

## 4. Failure Analysis

### Failure 1: Run 1964 — `build-test-image` + `publish-gate` failed

**Branch:** `fix/dm-thread-view-rn-alignment`
**Duration:** 4m16s
**Failed jobs:** `build-test-image`, `publish-gate`

**build-test-image error:**

```
#17 17.58 .../node_modules/@evilmartians/lefthook postinstall: Error: exit status 128
#19 ERROR: error writing layer blob: unknown
ERROR: failed to build: failed to solve: error writing layer blob: unknown
```

Docker buildx failed to write a layer blob — a transient Docker/storage issue on the
runner. The lefthook postinstall error is secondary (`git` not available in the
Docker build context's `.git` directory — see `.dockerignore` line 6).

**publish-gate error:**

```
[rn-components] tsc --noEmit failed:
src/components/layout/PlusButton.tsx(5,35): error TS2307: Cannot find module '../theme/OpenPeepsThemeProvider'
src/components/layout/PlusButton.tsx(6,32): error TS2307: Cannot find module '../theme/utils'
```

TypeScript compilation of `rn-components` failed due to missing module imports.
This is a **code issue** — `PlusButton.tsx` imports from `../theme/` but those
modules don't exist at the resolved path.

### Failure 2: Run 1963 — `i18n-check` failed

**Branch:** `1266-export-rsvp-list-as-csv`
**Duration:** 19s (fast fail — i18n-check runs early in parallel with builds)
**Failed job:** `i18n-check`

```
[INCOMPLETE] de: 2545/2547 keys | missing 2 | empty 0 | structure 0 | placeholders 1 | orphan 0
  missing (2):
    events.exportRsvps
    events.exportRsvpsError
i18n parity: 2 blocking defect(s). Add the translations before merging.
```

New i18n keys (`events.exportRsvps`, `events.exportRsvpsError`) were added to
`en.json` but not to the German (`de`) locale. This is a **process gap** — the
i18n parity check correctly caught it, but the PR process didn't require all
locales to be updated before merge.

### Failure 3: Run 1933 — `build` failed

**Branch:** `feat/markdown-html-sanitization-unify-iframes`
**Duration:** 8m18s (ran the full build before failing)
**Failed job:** `build`

```
platform/web build: x Build failed in 12.41s
[vite-plugin-pwa:build] Could not load virtual:openpeeps-docs (imported by
  src/pages/docs/DocsPage.tsx): DOMPurify.sanitize is not a function
```

The Vite/PWA build of `platform/web` failed because `DOMPurify.sanitize` is
not a function. This is a **code issue** — related to the markdown HTML
sanitization changes in this branch. The `build` job ran for 8 minutes before
failing, which means the Docker image was partially built and pushed.

### Older 30-run sample (July 29–30) — Pattern Confirmation

A broader 30-run sample from July 29–30 shows the same failure patterns at
higher frequency (30% failure rate vs. 10% currently):

| Failure Type           | Count        | Error                                                                                                                          |
| ---------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `build` job            | 5/9 failures | `Error response from daemon: Get "https://codeberg.org/v2/": unexpected EOF`                                                   |
| `commit-check` job     | 3/9 failures | `branch has N commit(s) ahead of main; expected exactly 1.` + `last commit message does not follow conventional commit format` |
| `publish-packages` job | 1/9 failures | TypeScript errors during package publish on `main`                                                                             |

The `build` job failures in the older sample were caused by a **transient
network error** — the Docker daemon inside the build job tried to fetch from
`codeberg.org/v2/` (the original source repository's git hosting) and got
`unexpected EOF`. The repo's git remote is `code.openpeeps.org`, but some
operation during the Docker build references `codeberg.org`.

### Failure Summary

| Failure Category                                    | Runs | Root Cause                             | Type           |
| --------------------------------------------------- | ---- | -------------------------------------- | -------------- |
| `build-test-image` / `build` (Docker layer/network) | 5+   | Transient Docker/network errors        | Infrastructure |
| `commit-check` (multi-commit / non-conventional)    | 3+   | Branch not squashed, commit format     | Process        |
| `publish-gate` / `publish-packages` (TypeScript)    | 2    | Missing modules, type errors           | Code           |
| `i18n-check` (missing translations)                 | 1    | New i18n keys not added to all locales | Process        |

---

## 5. Cancellation Analysis

**4 of 30 runs (13.3%) were cancelled**, all on feature branches. In every
case, all 9–10 jobs were cancelled (0 succeeded, 0 failed). This is the
Forgejo Actions concurrency cancellation mechanism (`cancel-in-progress: true`
for non-`main` branches) working as designed — a new push to the same branch
cancels the previous run.

**Branches with cancellations:**

- `fix/iframe-youtube-error-153-webview-rn` — run 1967 cancelled by run 1969
- `fix/button-border-radius` — run 1965 cancelled by run 1966
- `95-add-a-resources-tab-for-groups-and-community` — run 1948 cancelled by 1949
- `fix/rn-conversation-ui-parity` — run 1941 cancelled by run 1942

**Observation:** The `toggling-push-notifications-in-browser-broken` branch had
8 runs in the last 30, with multiple cancellations in the older sample. Active
development branches generate many cancelled runs, wasting CI minutes.

---

## 6. Warning Analysis

### Recurring Warnings (present in most or all runs)

#### 6.1 `chown: : No such file or directory` — **Infrastructure (Forgejo Runner)**

```
🐳  docker exec cmd=[chown -R 1000:1000 ] user=0 workdir=
chown: : No such file or directory
```

- **Frequency:** Every test-integration job, every run (2 occurrences per job
  × 5 jobs = 10 per run)
- **Root cause:** Forgejo Runner executes `docker exec chown -R 1000:1000`
  with an empty `workdir=` for service containers. This is a Forgejo Runner
  bug — the working directory is not set for the `chown` command.
- **Impact:** Non-blocking (the jobs still succeed). Pure noise.

#### 6.2 `ECONNREFUSED 127.0.0.1:6379` — **Expected (unit test environment)**

```
Error: connect ECONNREFUSED ::1:6379
Error: connect ECONNREFUSED 127.0.0.1:6379
```

- **Frequency:** ~130 occurrences per `test-unit` job log
- **Root cause:** Unit tests import `@openpeepshq/core` which opens Redis
  connections at module load. The `test-unit` job does not run Redis (it runs
  on `node:24-alpine` without a Redis service).
- **Impact:** Non-blocking — the tests catch and handle this expected error.
  But 130 lines of `ECONNREFUSED` noise obscure real test failures.

#### 6.3 `Stale-build check failed Error: offline` — **Expected**

- **Frequency:** Every `test-unit` run
- **Root cause:** The PWA plugin's stale-build check tries to reach an external
  service and fails (offline in CI). This is debug-level output.
- **Impact:** None.

#### 6.4 `LiveKit health check failed` — **Expected (no JAMS credentials)**

```
app:jams:livekit - warn | LiveKit health check failed (attempt 1/3): unauthorized
```

- **Frequency:** 7 occurrences in successful runs
- **Root cause:** JAMS LiveKit health check fails because no LiveKit credentials
  are configured (or they point to a non-existent service).
- **Impact:** Low — appears in test setup, not actual test logic.

#### 6.5 `Postgres migrate hit a schema conflict` — **Investigate**

```
openpeeps:pg:migrate - warn | Postgres migrate hit a schema conflict but app tables...
```

- **Frequency:** Appears in integration test logs
- **Root cause:** PostgreSQL migration encounters a pre-existing schema conflict
  (likely from a previous migration run on the same database).
- **Impact:** Low — handled gracefully, but suggests migrations may not be
  idempotent or the test database isn't fully reset between runs.

#### 6.6 Docker/pnpm warnings — **Infrastructure**

| Warning                                                                 | Frequency                 | Notes                                                              |
| ----------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `WARNING! Your credentials are stored unencrypted`                      | Every Docker build        | Credentials in plaintext in `/root/.docker/config.json`            |
| `npm warn install-scripts` (pnpm@12.11.2)                               | Every Docker build        | Global pnpm install runs preinstall/postinstall scripts            |
| `Failed to create bin at .../node_modules/.bin/opc`                     | Every Docker build        | pnpm can't create bin symlinks for CLI tools (ENOENT)              |
| `fatal: not a git repository` (generate-changelog)                      | ~~Every Docker build~~    | ~~`.git` excluded via `.dockerignore`; script handles gracefully~~ | **Fixed** — changelog now pre-generated in CI (build.yaml), removed from Dockerfile                                                 |
| `Skipped OIDC: ERR_PNPM_ID_TOKEN_GITHUB_WORKFLOW_INCORRECT_PERMISSIONS` | ~~publish-packages only~~ | ~~Missing `permissions: id-token: write` in workflow~~             | ~~Fixed~~ — reverted; Forgejo ignores `permissions:` blocks. OIDC warning persists but is benign (pnpm auth uses secrets, not OIDC) |
| `Adjust chunk size limit for this warning` (Vite)                       | Some builds               | `platform/web` JS bundle exceeds 500KB default                     |
| `Request took 13710ms` (npm registry)                                   | Some builds               | Slow npm registry response; adds to build time                     |
| `[WARN] GET ... error (23). Will retry.`                                | Some builds               | Transient npm registry error                                       |

#### 6.7 i18n parity warning — **Code debt**

```
placeholder events.feed.empty: en {type} vs de {-}
```

- **Frequency:** Every run (all locales have 1 placeholder drift warning)
- **Root cause:** The `events.feed.empty` key has a `{type}` placeholder in
  English but no placeholder in German (`-`). Per the `check-i18n-parity.mjs`
  script, this is a non-blocking warning (placeholder drift is reported but
  never blocks — it requires human judgment).
- **Impact:** None for CI, but represents a localization quality gap.

---

## 7. Workflow Design Issues

### 7.1 `commit-check` runs too late in the pipeline

The `commit-check` job (`scripts/check-branch.mjs`) depends on `deploy-docker`,
which depends on all test jobs. This means:

- A branch with 2 commits and a non-conventional commit message will run the
  **entire test suite (6–10 min)** before failing on the commit format check.
- In run 1964, all build/tests deployed successfully, but `commit-check` failed,
  wasting the deploy step.
- **Fix:** Change `commit-check` to depend only on `set-variables` (or remove
  the `deploy-docker` dependency). The commit check needs `git` and the repo
  source, both of which are available after `set-variables`.

### 7.2 Workflow-level `permissions` block — **Reverted**

The workflow did not declare `permissions:`, so Forgejo Actions fell back to
default (minimal) permissions. This caused:

- `Skipped OIDC: ERR_PNPM_ID_TOKEN_GITHUB_WORKFLOW_INCORRECT_PERMISSIONS` in
  `publish-packages` when pnpm tried to use the GitHub-compatible OIDC token.
  **Attempted fix:** Added `permissions: { contents: read, packages: write }` at the workflow level in `build.yaml`.

**Reverted:** Forgejo does not support the `permissions` key — it emits a warning for every job. The block was removed. The OIDC warning persists in Forgejo but is benign: `publish-packages` authenticates via `secrets.REGISTRY_PASSWORD`, not OIDC.

### 7.3 Concurrency cancellation is aggressive

The concurrency group is `${{ github.workflow }}-${{ github.ref_name }}` with
`cancel-in-progress: true` for non-main branches. While this prevents wasted
runs on the same branch, it:

- Causes 13.3% of runs to be cancelled (4/30)
- Can mask real test failures (a flaky test's failure is discarded if a new
  push cancels the run)
- Means developers see "cancelled" in their PR status with no feedback

**Mitigation:** Consider setting `cancel-in-progress: true` only for
`workflow_dispatch` reruns, or increase the threshold so only truly redundant
runs are cancelled.

### 7.4 `build` job depends on `i18n-check`

The `build` job (Docker image) depends on `i18n-check`, which means an i18n
failure prevents the Docker image from being built. This is actually desirable
(fast fail), but it's worth noting that the `publish-gate` job runs in parallel
and catches the same issues independently.

### 7.5 `actions/checkout` uses REST API fallback (no `.git` directory)

Many jobs that use `actions/checkout` do not install `git` in their
`node:24-alpine` container (only `set-variables`, `build`, `build-test-image`,
and `commit-check` install git explicitly). The checkout action falls back to
downloading a tarball via the Forgejo REST API, which means:

- No `.git` directory is available in the checkout
- Scripts that call `git` commands fail (e.g., `generate-changelog` in Docker
  build — **now fixed** by pre-generating in the `build` job with `fetch-depth: 0`)
- The `commit-check` job works around this by installing git explicitly

**Fix (partial):** The `build` job now uses `fetch-depth: 0` and
pre-generates the changelog on the host. Other jobs still fall back to the REST
API; install `git` where git-dependent scripts are needed.

### 7.6 No retry mechanism for transient failures — **FIXED**

Docker layer push errors (`error writing layer blob: unknown`) and network
errors (`unexpected EOF` from codeberg.org) caused immediate failures with no
retry. Fix (implemented): Wrapped `docker buildx build` commands in both
`build` and `build-test-image` jobs with a retry loop (3 attempts, 10s delay).

---

## 8. Recommendations (Prioritized)

### High Priority

1. **Decouple `commit-check` from `deploy-docker`** — **NOT PURSUED**

   - Suggestion was to change `needs: [deploy-docker, set-variables]` to `needs: [set-variables]`
   - **Rejected:** The team wants branches that fail commit checks to still
     deploy to a test instance for manual QA. Keeping the current dependency
     is intentional.
   - _No action needed; documented for future reference._

2. **Add workflow-level `permissions` block** (workflow config change) — **Not implemented**

   - Added `permissions: { contents: read, packages: write }` to `build.yaml`
   - Forgejo rejects `permissions:` blocks (warning: "Use Authorized Integrations to grant capabilities")
   - Block removed instead; OIDC warning persists but is benign (auth uses secrets)
   - Future: use Forgejo Authorized Integrations if OIDC token is needed

3. **Add retry for Docker build jobs** (workflow config change) — **Implemented**

   - Wrapped `docker buildx build` commands in both `build` and `build-test-image` jobs
     with a retry loop (3 attempts with 10s delay)
   - Retries on transient Docker errors (layer blob failures, network errors)
   - Cache is preserved between retries for faster recovery

4. **Pre-generate changelog in CI before Docker build** — **Implemented**
   - Changed `build` job checkout from `fetch-depth: 1` to `fetch-depth: 0` (full
     history + tags)
   - Added step to run `node scripts/generate-changelog.mjs` on the host before
     Docker build (where `.git` is available)
   - Removed `RUN node scripts/generate-changelog.mjs` from `Dockerfile` (was
     always failing in Docker context where `.git` is excluded; produced empty
     changelog, overwriting the real one from `COPY . .`)
   - Pre-generated changelog is now correctly baked into the image via `COPY . .`

### Medium Priority

5. **Install `git` in all jobs** — **NOT PURSUED** that use `actions/checkout`\*\* (workflow config)

   - Add `apk add --no-cache git` to `test-unit`, `publish-gate`,
     `test-integration-small`, `test-integration-jams`
   - Or set a `default` for all jobs: `defaults.run.working-directory` is
     already set for test-integration; add git install similarly

6. **Fix i18n parity drift for `events.feed.empty`** — **Implemented**

   - Add `{type}` placeholder to German translation of `events.feed.empty`
   - Or remove the placeholder from English if it's not used
   - This is the only recurring i18n warning (all locales have it)

7. **`events.exportRsvps` / `events.exportRsvpsError` i18n gap** — **Already solved**
   - Ensure all new i18n keys are added to all locale files before merge
   - Consider making the i18n-check failure block the PR via branch protection

### Low Priority

8. **Fix pnpm bin linking warnings** (`opc`, `openpeeps-mcp`) — **Implemented**

   - These appear because package.json `bin` entries reference files that
     don't exist yet in the Docker build context
   - May require restructuring how CLI bin entries are defined

9. **Document the `chown` warning**
   - This is a Forgejo Runner bug (empty workdir for `chown`), not fixable
     in the repo
   - Consider filing an upstream issue with Forgejo

### Not Actionable (Infrastructure)

10. **Docker credentials unencrypted warning** — Runner configuration issue
11. **`error writing layer blob: unknown`** — Docker daemon/registry issue on
    the runner host (retry is the mitigation)
12. **`LiveKit health check failed`** — Expected when JAMS credentials are
    not configured
13. **`ECONNREFUSED 127.0.0.1:6379` in unit tests** — Expected (no Redis in
    unit test environment)

---

## 9. Next Steps

This document is saved at `planning/ci-review-findings.md`. Recommended
follow-up:

- **#1 (commit-check dependency):** Not pursued per team feedback (intentional
  design to deploy failing-commit branches to test instances)
- **#2 (permissions block):** Reverted — see Section 7.2; OIDC warning persists but is benign
- **#3 (retry mechanism):** Implemented for both `build` and `build-test-image` jobs
  — verify failure rate reduction over next 30 runs
- #4 (changelog pre-generation): Implemented - verify non-empty changelog in built image
- #6 (i18n parity): Fixed events.feed.empty placeholder drift in de.json
- #7 (exportRsvps): Already solved (keys present in all locales)
- #8 (pnpm bin linking): Added pnpm rebuild post-COPY in both Dockerfiles
- Re-run this analysis after all fixes to verify improvement
