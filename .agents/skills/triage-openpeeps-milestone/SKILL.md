---
name: triage-openpeeps-milestone
description: Update an OpenPeeps milestone description with a burndown chart for the 7 days before the due date (open-issue count per day, split across four pipeline stages) plus a "needs human intervention" line. Use when refreshing milestone stats on code.openpeeps.org.
---

# Triage OpenPeeps Milestone

Updates a Gitea/Forgejo milestone description with a **burndown chart** for the
7 days before the milestone due date. Each day's bar shows the open-issue
count scaled to the busiest day, split into four pipeline stages by mapping
each issue's `flow/*` label (and its label history) to a stage:

- `░` **pre-planning** — no `flow/*` label, `flow/needs-specs`,
  `flow/ready-to-schedule`
- `▒` **planning** — `flow/ready-to-plan`, `flow/ready-to-review-plan`
- `▓` **implementation** — `flow/ready-to-implement`, `flow/ready-to-review`,
  `flow/ready-to-merge`, `flow/merge-accepted`
- `█` **testing** — `flow/on-test-instance` (pre-merge PR verification),
  `flow/ready-to-test` (post-merge, awaiting QA close),
  `flow/waiting-for-app-build` (post-merge RN-only change, not testable until
  the native app build ships)

Each issue's stage history is reconstructed from its `/timeline` label events
(`flow/*` labels are exclusive, so the latest flow event wins; the issue's
current label is the authoritative end-of-timeline state). The `|` marker in
each bar shows that day's ideal count (linear from the window's first day to 0
on the due date). Below the chart a single "🧍 Needs human intervention" line
reports how many open issues in the
milestone are currently waiting on a human gate:
`flow/ready-to-schedule`, `flow/ready-to-review-plan`, `flow/ready-to-merge`,
`flow/on-test-instance`, `flow/waiting-for-app-build` and `flow/ready-to-test`. Scope changes (issues moved
in/out during the window) are not reflected.

## Scripts

Two scripts live in this skill directory:

### `generate-stats.py` — burndown chart

```bash
python3 .agents/skills/triage-openpeeps-milestone/generate-stats.py --milestone-id <ID>
```

Scans all repository issues (the `milestone=N` API filter returns incomplete
results due to a Gitea pagination bug, so it scans all issues and filters
client-side) and renders a 7-day burndown chart (bars scaled to the busiest
day, split across the four pipeline stages, with a `|` marking each day's
ideal count) and a "needs human intervention" line. Each issue's stage history comes from its `/timeline`
label events. Writes the description via `PATCH /milestones/{id}`. Pass
`--dry-run` to print the description without updating the milestone.

### `find-ready-to-test.py` — label issues with merged PRs

```bash
python3 .agents/skills/triage-openpeeps-milestone/find-ready-to-test.py --milestone-id <ID>
```

For each milestone issue without a post-merge label (`flow/ready-to-test` or
`flow/waiting-for-app-build`):

1. Finds merged PRs referencing it (via `#NNNN` text refs and `/issues/N` URLs in
   PR body/title).
2. Finds the issue's last comment date.
3. If a merged PR was merged **after** the last comment, adds the post-merge
   label for the newest such PR: `flow/waiting-for-app-build` when it changed
   **only** `platform/rn-components` files (the change is not testable until the
   native app is rebuilt with it), otherwise `flow/ready-to-test`.

Run this before `generate-stats.py` to pick up newly-merged work.

## Configuration

Both scripts take the same CLI options:

- `--milestone-id <ID>` (required) — numeric ID of the target milestone
- `--token <token>` (optional) — Forgejo API token (needs `repo` scope +
  milestone edit access). Defaults to the `FORGEJO_TOKEN` environment variable
  when omitted.

The Forgejo API base URL is a `BASE` constant at the top of each script.

## Requirements

- Python 3.x (standard library only — uses `urllib.request` + `json`)
- A Gitea/Forgejo API token with permission to read issues/PRs/comments and
  edit the target milestone
