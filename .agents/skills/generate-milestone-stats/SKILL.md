---
name: generate-milestone-stats
description: Update an OpenPeeps milestone description with open-issue stats (a per-stage counts table and a 7-day burndown chart split across four pipeline stages) plus a "needs human intervention" line. Use when refreshing milestone stats on code.openpeeps.org.
---

# Generate Milestone Stats

Updates a Gitea/Forgejo milestone description with milestone stats. This skill
**only compiles stats and writes the milestone description** — it never labels
issues, moves them between flow stages, or otherwise mutates issue state.

The description contains:

1. **A stats table** counting open issues per pipeline stage.
2. **A burndown chart** for the 7 days before the milestone due date. Each
   day's bar shows the open-issue count scaled to the busiest day, split into
   four pipeline stages by mapping each issue's `flow/*` label (and its label
   history) to a stage:
   - `░` **pre-planning** — no `flow/*` label, `flow/needs-specs`,
     `flow/ready-to-schedule`
   - `▒` **planning** — `flow/ready-to-plan`, `flow/ready-to-review-plan`
   - `▓` **implementation** — `flow/ready-to-implement`, `flow/ready-to-review`,
     `flow/ready-to-merge`, `flow/merge-accepted`
   - `█` **testing** — `flow/on-test-instance` (pre-merge PR verification),
     `flow/ready-to-test` (post-merge, awaiting QA close),
     `flow/waiting-for-app-build` (post-merge RN-only change, not testable until
     the native app build ships)
3. **A "🧍 Needs human intervention" line** reporting how many open issues in
   the milestone are currently waiting on a human gate:
   `flow/needs-specs`, `flow/ready-to-schedule`, `flow/ready-to-review-plan`,
   `flow/ready-to-merge`, `flow/on-test-instance`, `flow/waiting-for-app-build`
   and `flow/ready-to-test`. Each gate is rendered as a markdown link to the
   milestone's open-issue list filtered to that gate's `flow/*` label, so even
   a zero count still links to the (empty) filter view. The Forgejo issue
   filter takes a **numeric label id** (`?labels=<id>`, not the label name —
   a name is silently ignored), so the script resolves each gate's label name
   to its id from the org/repo label endpoints first; a gate whose id cannot
   be resolved falls back to the plain milestone URL.

Each issue's stage history is reconstructed from its `/timeline` label events
(`flow/*` labels are exclusive, so the latest flow event wins; the issue's
current label is the authoritative end-of-timeline state). The `|` marker in
each bar shows that day's ideal count (linear from the window's first day to 0
on the due date). Scope changes (issues moved in/out during the window) are not
reflected in the burndown.

## Script

One script lives in this skill directory:

### `generate-stats.py` — stats table + burndown chart

```bash
python3 .agents/skills/generate-milestone-stats/generate-stats.py --milestone-id <ID>
```

Scans all repository issues (the `milestone=N` API filter returns incomplete
results due to a Gitea pagination bug, so it scans all issues and filters
client-side) and renders the stats table, the 7-day burndown chart, and the
"needs human intervention" line. Each issue's stage history comes from its
`/timeline` label events. Writes the description via `PATCH /milestones/{id}`.
Pass `--dry-run` to print the description without updating the milestone.

## Configuration

The script takes the following CLI options:

- `--milestone-id <ID>` (required) — numeric ID of the target milestone
- `--token <token>` (optional) — Forgejo API token (needs `repo` scope +
  milestone edit access). Defaults to the `FORGEJO_TOKEN` environment variable
  when omitted.
- `--dry-run` (optional) — print the rendered description without updating the
  milestone.

The Forgejo API base URL is a `BASE` constant at the top of the script.

## Requirements

- Python 3.x (standard library only — uses `urllib.request` + `json`)
- A Gitea/Forgejo API token with permission to read issues/timelines and edit
  the target milestone
