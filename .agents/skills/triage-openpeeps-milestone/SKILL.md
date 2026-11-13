---
name: triage-openpeeps-milestone
description: Update an OpenPeeps milestone description with a compact stats table (open issues into "to be worked on" / "to be reworked" / "to be tested") plus a burndown chart for the 7 days before the due date. Use when refreshing milestone stats on code.openpeeps.org.
---

# Triage OpenPeeps Milestone

Updates a Gitea/Forgejo milestone description with a compact stats table that
categorizes **open** issues into three buckets based on `flow/*` labels:

- **To be worked on** — no `flow/*` label
- **To be reworked** — has `flow/ready-to-rework` label
- **To be tested** — has `flow/ready-to-test` label

Closed issues are ignored in the stats table. The table has one column per
category and rows for Total / Assigned / Unassigned.

`generate-stats.py` also appends a **burndown chart** for the 7 days before
the milestone due date. Each day's bar is split into four pipeline stages by
mapping each issue's `flow/*` label (and its label history) to a stage:

- `░` **pre-planning** — no `flow/*` label, `flow/needs-specs`, `flow/ready-to-schedule`
- `▒` **planning** — `flow/ready-to-plan`, `flow/ready-to-review-plan`
- `▓` **implementation** — `flow/ready-to-implement`, `flow/ready-to-review`,
  `flow/ready-to-rework`, `flow/ready-to-replan`, `flow/ready-to-merge`,
  `flow/merge-accepted`
- `█` **testing** — `flow/ready-to-test`, `flow/on-test-instance`,
  `flow/waiting-for-app-build`

Each issue's stage history is reconstructed from its `/timeline` label events
(`flow/*` labels are exclusive, so the latest flow event wins; the issue's
current label is the authoritative end-of-timeline state). Below the chart a
single "🧍 Needs human intervention" line reports how many open issues in the
milestone are currently waiting on a human gate:
`flow/ready-to-schedule`, `flow/ready-to-review-plan`, `flow/ready-to-merge`
and `flow/ready-to-test`. A linear ideal line runs from the first day's count
to 0 on the due date. Scope changes (issues moved in/out during the window)
are not reflected.

## Scripts

Two scripts live in this skill directory:

### `generate-stats.py` — stats table

```bash
python3 .agents/skills/triage-openpeeps-milestone/generate-stats.py --milestone-id <ID>
```

Scans all repository issues (the `milestone=N` API filter returns incomplete
results due to a Gitea pagination bug, so it scans all issues and filters
client-side), categorizes open issues by `flow/*` labels into the stats table,
and appends a 7-day burndown chart (open-issue count per day, split across the
four pipeline stages, + ideal line). Each issue's stage history comes from its
`/timeline` label events. Writes the combined description via
`PATCH /milestones/{id}`. Pass `--dry-run` to print the description without
updating the milestone.

### `find-ready-to-test.py` — label issues with merged PRs

```bash
python3 .agents/skills/triage-openpeeps-milestone/find-ready-to-test.py --milestone-id <ID>
```

For each milestone issue without the `flow/ready-to-test` label:

1. Finds merged PRs referencing it (via `#NNNN` text refs and `/issues/N` URLs in
   PR body/title).
2. Finds the issue's last comment date.
3. If a merged PR was merged **after** the last comment, adds the
   `flow/ready-to-test` org label.

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
