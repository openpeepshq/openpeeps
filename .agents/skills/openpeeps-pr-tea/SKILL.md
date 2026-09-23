---
name: openpeeps-pr-tea
description: >-
  Open a proper pull request on code.openpeeps.org using the tea CLI. Covers
  login, branch setup, rebase, squash to a single commit, sign-off, local CI
  gate verification, force-push, and `tea pr create`, aligned with AGENTS.md and
  CI (check-branch.mjs). Use this before creating a PR or after finishing edits
  on a feature branch.
---

# Open a PR with tea (OpenPeeps)

**Type:** Rigid for git/CI gates; the `tea pr create` invocation is a thin CLI wrapper around the Gitea web form.

This skill opens a pull request on `code.openpeeps.org/openpeeps/openpeeps` using the
`tea` CLI (Gitea/Forgejo client). It enforces the same git and CI gates documented in
`AGENTS.md` and `scripts/check-branch.mjs`, then creates the PR via `tea pr create`.

## Prerequisites

1. **`tea` CLI** — `tea --version` (v0.14+). Install: `brew install tea`.
2. **Login configured** for `code.openpeeps.org` — `tea logins ls` should list it.
   If missing or not default:

   ```bash
   tea login --base-url https://code.openpeeps.org
   tea logins default code.openpeeps.org
   ```

   You'll need a Gitea access token (*Settings → Access Tokens → Tokens*).
3. **SSH remote** — `git remote -v` should show `ssh://git@code.openpeeps.org/openpeeps/openpeeps.git`.

## Step 1 — Align local `main` with remote

```bash
git fetch origin
git branch -f main origin/main
```

`check-branch.mjs` compares `HEAD` to the **local** `main` branch, so local `main`
must match `origin/main` before running the check.

## Step 2 — Create a feature branch from `main`

```bash
git checkout -b feat/your-short-description main
```

## Step 3 — Make changes, then squash to one commit

After all edits are done, squash every commit on the branch into a single commit.
The working tree **must** be clean:

```bash
./scripts/squash-branch.sh --ci \
  -m "feat(scope): your concise conventional subject"
```

The subject **must** match the conventional-commit format validated by
`scripts/check-branch.mjs`: `type(scope): description` (scope is optional).
Examples: `feat(api): add user endpoint`, `fix: typo in README`.

## Step 4 — Sign off

Append the `Signed-off-by` trailer (uses `user.name`/`user.email` from git config):

```bash
git commit --amend --signoff
```

This preserves the subject from Step 3 and appends the trailer. Verify:

```bash
git log -1 --pretty=format:"%s%n%b"
```

You should see the subject followed by `Signed-off-by: Your Name <you@example.com>`.

## Step 5 — Verify CI gates locally

```bash
node scripts/check-branch.mjs
```

Must print `All checks passed.` This confirms: exactly one commit ahead of `main`
and a conventional-commit subject.

## Step 6 — Push the branch

```bash
git push --force-with-lease origin HEAD
```

`--force-with-lease` avoids clobbering any remote work that diverged.

## Step 7 — Open the PR with tea

```bash
tea pr create \
  --base "main" \
  --head "$(git rev-parse --abbrev-ref HEAD)" \
  --title "$(git log -1 --pretty=format:%s)" \
  --description "$(git log -1 --pretty=format:%b)" \
  --repo openpeeps/openpeeps
```

> **No `--labels` and no `--milestone`** — AGENTS.md says maintainers apply those
> manually.

> **Issue references** in the description body must use `References #N` — not
> `Fixes #`, `Closes #`, or `Resolves #` (those auto-close issues on merge).

> If the change touches **>3 files OR >6 lines**, include a written outline in
> the PR description (see `AGENTS.md` → Explaining your changes).

## Step 8 — Verify the PR

```bash
tea pr ls --repo openpeeps/openpeeps --state open
```

Confirm:

- Title matches the conventional commit subject
- No labels or milestones were set
- Base branch is `main`, not `staging` or `stable`
- No merge conflicts with `main`

## Common Failures

| Symptom | Fix |
|---------|-----|
| `tea pr create` → "not logged in" | `tea login --base-url https://code.openpeeps.org` |
| `check-branch.mjs` → "could not compare to main" | `git fetch origin && git branch -f main origin/main` |
| Multiple commits ahead of main | `./scripts/squash-branch.sh --ci -m "type(scope): desc"` |
| `--force-with-lease` rejected (stale) | `git fetch origin` then retry |
| PR title doesn't match commit subject | Edit the PR title in the browser to match `git log -1 --pretty=%s` |
| Sign-off trailer missing | `git commit --amend --signoff` (unpushed only) |
