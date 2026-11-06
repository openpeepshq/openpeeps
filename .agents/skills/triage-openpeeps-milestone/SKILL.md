---
name: triage-openpeeps-milestone
description: Update an OpenPeeps milestone description with a compact stats table (open issues into "to be worked on" / "to be reworked" / "to be tested") plus a burndown chart for the 7 days before the due date. Use when refreshing milestone stats on code.openpeeps.org.
---

# Triage OpenPeeps Milestone

Updates a Gitea/Forgejo milestone description with a compact stats table that
categorizes **open** issues into three buckets based on `flow/*` labels:

- **To be worked on** — no `flow/*` label
- **To be reworked** — has `flow/rework` label
- **To be tested** — has `flow/ready-to-test` label

Closed issues are ignored in the stats table. The table has one column per
category and rows for Total / Assigned / Unassigned.

`generate-stats.py` also appends a **burndown chart** for the 7 days before
the milestone due date. Each day's bar is split into a solid `█` "still being
worked on" segment and a lighter `░` "ready to test" segment (issues that had
the `flow/ready-to-test` label by that day), based on label-added dates pulled
from the issue events API. A linear ideal line runs from the first day's count
to 0 on the due date. Scope changes (issues moved in/out during the window) are
not reflected.

## Scripts

Two scripts live in this skill directory:

### `generate-stats.py` — stats table

```bash
python3 .agents/skills/triage-openpeeps-milestone/generate-stats.py --milestone-id <ID>
```

Scans all repository issues (the `milestone=N` API filter returns incomplete
results due to a Gitea pagination bug, so it scans all issues and filters
client-side), categorizes open issues by `flow/*` labels into the stats table,
and appends a 7-day burndown chart (open-issue count per day + ideal line).
Writes the combined description via `PATCH /milestones/{id}`.

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
