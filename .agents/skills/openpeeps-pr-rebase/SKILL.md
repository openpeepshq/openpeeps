---
name: openpeeps-pr-rebase
description: >-
  Re-open an existing OpenPeeps pull request, rebase it onto main, resolve merge
  conflicts (keeping platform/react and platform/rn-components in sync), verify
  the build/tests/i18n parity, and force-push to update the PR on
  code.openpeeps.org. Use when PR HEAD has fallen behind main, when CI reports
  merge conflicts, or when main changed in a way that affects the PR's files.
---

# Rebase and update an existing OpenPeeps PR

Type: Rigid for the git/CI gates; the conflict-resolution and rn/web-sync
decisions are flexible and context-dependent.

This is the "bring an existing PR up to date" counterpart to `openpeeps-pr-tea`
(which *creates* a PR). It rebases the PR branch onto current `main`, resolves
conflicts in a way that preserves both sides of a conflict (not just one), keeps
`platform/react` and `platform/rn-components` in sync, verifies the change, then
force-pushes to update the existing PR.

## When to use

- `tea pr <n>` shows the PR branch is behind `main`
- Main has drifted since the PR was opened (e.g. a shared type, i18n key, or
  component the PR also touches)
- CI reports a merge conflict with `main`
- The PR's feature should also cover a new tab/section that main introduced
  (e.g. a `resources` tab added on main while the PR was open)

## Step 1 — Find the branch and check out HEAD cleanly

From the repo root, read the PR to get its source branch (the worktree may be in
detached HEAD on `origin/main`):

```bash
tea pr <n>            # prints: "main <- <branch>"
git fetch origin main <branch>
git checkout -b <branch> origin/<branch>   # if detached or not on the PR branch
```

Confirm the PR is exactly one commit ahead of the *old* base, and note what main
has since gained:

```bash
git --no-pager log --oneline main..HEAD      # expect 1 commit (the PR)
git --no-pager rev-list --count HEAD..origin/main   # commits main gained
```

## Step 2 — Rebase onto current main

```bash
GIT_EDITOR=true git rebase origin/main
```

`GIT_EDITOR=true` lets the rebase run non-interactively; the PR's original
commit message is preserved. Stop on the first conflict.

## Step 3 — Resolve conflicts with both sides in mind

A conflict is an opportunity to merge *intent*, not just text. Typical case here:
main and the PR both touched the same shared surface, so resolve toward the
**shared** representation so Web and RN agree.

Common conflict shapes and how to resolve each:

1. **`groupSectionFromHash` / `GroupSection` (in `platform/common`)** — main may
   have added a new tab (e.g. `resources`). Extend the shared
   `GroupSection = 'posts' | 'events' | 'resources' | 'description'` and the
   matching branch in `groupSectionFromHash`, then add a matching
   `groupSectionPath` test. This fixes the deep link on **both** Web and RN
   (RN reads the same helper via `route.params.tab`).

2. **`GroupShow` (Web `platform/react/src/pages/groups/Show.tsx` vs
   RN `platform/rn-components/src/pages/groups/Show.tsx`)** — if main switched a
   tab to a stateful `useState`/`window.history.replaceState` and the PR switched
   it to a hash-driven render, adopt the hash-driven form on **both** platforms
   and include the main-added tab (e.g. `resources`) as a peer tab. Prefer the
   shared `GroupSection` type over a hand-written local union (`type Tab`).

3. **`goto.ts` (RN) or any local `'posts' | 'events' | ...` union** — replace the
   local union with `GroupSection` from `@openpeepshq/common/lib` so the two
   platforms can't drift.

4. **`GroupShareMenu` (Web + RN)** — both must expose the same set of "copy link"
   items, one per real tab, using the same i18n keys. If a main-added tab isn't
   there, add a "Copy resources link" item to **both**, then add the matching
   `groups.share.copyResourcesLink` / `groups.share.resourcesLinkCopied` keys to
   `en.json` **and** `de.json`.

General conflict rules while rebasing:

- Resolve in favor of the more general/shared approach; the goal is one source of
  truth that both `platform/react` and `platform/rn-components` consume.
- Per `AGENTS.md`: Web and native stay in sync — a UI change in web must be
  mirrored in RN in the same change. Logic lives in shared hooks or
  `platform/common`; only the render layer differs.
- After resolving, mark files resolved and continue:

  ```bash
  git add <resolved-files>
  GIT_EDITOR=true git rebase --continue
  ```

## Step 4 — Verify locally (mirrors CI)

Rebuild the workspace dependency chain before type-checking dependents — TS
resolves types from each package's `dist/`, so `dist` must exist first:

```bash
pnpm --filter @openpeepshq/common build        # then client -> react -> rn-components
pnpm --filter @openpeepshq/react build
pnpm --filter @openpeepshq/rn-components build
```

> If `docs-site` build is pulled in by `pnpm -r build`, it commonly fails with
> `git archive staging platform/web/docs` (no `staging` ref in this env). That is
> unrelated to this PR — ignore it and build the platform packages individually as
> above.

Then, for each touched package:

```bash
pnpm --filter @openpeepshq/common exec vitest run src/lib/__tests__/groupHelpers.test.ts
pnpm --filter @openpeepshq/react typecheck
pnpm --filter @openpeepshq/rn-components typecheck
pnpm --filter @openpeepshq/i18n exec prettier --check "src/locales/en.json" "src/locales/de.json"
node scripts/check-i18n-parity.mjs   # expect 0 blocking
```

CI gates before push:

```bash
git --no-pager rev-list --count main..HEAD     # expect 1
node scripts/check-branch.mjs                  # must print "All checks passed."
```

### Tool gotchas in this environment

- `pnpm --filter <pkg> test` runs `vitest` in **watch** mode and hangs. Use
  `pnpm --filter <pkg> exec vitest run <path>` to run once and exit.
- `pnpm --filter <pkg> format` (prettier `--write .`) reformats the **whole**
  package — that pulls unrelated files into the PR. Scope prettier to the files
  you touched, or revert side effects before the next step.
- ESLint may fail with `Cannot find package '@eslint/js'` because the root
  `.npmrc` overrides `public-hoist-pattern` and so `@eslint/js` is not hoisted
  in the worktree. Confirm Prettier (`prettier --check`) passes; the ESLint
  failure is an environment/hoisting issue, not a code defect.

## Step 5 — Revert unintended side effects before pushing

Builds regenerate artifacts and `format` rewrites whole packages. Reset
anything that is not a deliberate part of the PR:

```bash
git checkout -- docs-site/src/generated/docs-manifest.json
git checkout -- <other build/format side effects>
git --no-pager status --short   # review the final diff is exactly what you intend
```

Confirm the final diff is the single rebase commit with only the intended files:

```bash
git --no-pager diff --stat main..HEAD
```

## Step 6 — Force-push to update the existing PR

Fetch to avoid a stale-ref error, then push with `--force-with-lease` (this
rebases the same PR branch in place — it is not a shared main branch):

```bash
git fetch origin <branch>
git push --force-with-lease origin <branch>
```

## Step 7 — Confirm the PR updated

```bash
tea pr <n>
```

Verify:
- The branch now tracks the rebase commit (`origin/main <- <branch>`)
- No "merge conflict" line appears
- New CI runs triggered by the push (view via `tea pr <n>` or the forge UI)
