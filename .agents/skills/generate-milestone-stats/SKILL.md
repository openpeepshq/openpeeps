---
name: generate-milestone-stats
description: Update an OpenPeeps milestone description with open-issue stats split across four pipeline stages (a 7-day burndown chart for the current release milestone, a single snapshot bar for future milestones) plus a "needs human intervention" line. Past milestones are left untouched. Use when refreshing milestone stats on code.openpeeps.org.
---

# Generate Milestone Stats

Updates a Gitea/Forgejo milestone description with milestone stats. This skill
**only compiles stats and writes the milestone description** — it never labels
issues, moves them between flow stages, or otherwise mutates issue state.

## Milestone modes

The script first classifies the target milestone and behaves differently per
mode:

- **Past** — the milestone is closed, or its due date has already passed.
  The description is **left untouched**; the script exits without any API
  write.
- **Current** — the open milestone with the **earliest non-past due date**
  (ties all count as current). Gets the full **7-day burndown chart**.
- **Future** — any other open milestone (later due dates, or no due date).
  Gets a **single snapshot bar** of its open issues by stage, read from each
  issue's current `flow/*` label — no issue timelines are fetched, so this
  mode is fast.

The description contains:

1. **A chart** of open issues split across four pipeline stages. For a
   **current** milestone it is a **7-day burndown** (one bar per day, scaled
   to the busiest day, for the 7 days up to the due date); for a **future**
   milestone it is a **single snapshot bar** of today's open issues. Each
   issue's stage is mapped from its `flow/*` label (and, for the burndown, its
   label history):
   - `░` **pre-planning** — no `flow/*` label, `flow/needs-specs`,
     `flow/ready-to-schedule`
   - `▒` **planning** — `flow/ready-to-plan`, `flow/ready-to-review-plan`
   - `▓` **implementation** — `flow/ready-to-implement`, `flow/ready-to-review`,
     `flow/ready-to-merge`, `flow/merge-accepted`
   - `█` **testing** — `flow/on-test-instance` (pre-merge PR verification),
     `flow/ready-to-test` (post-merge, awaiting QA close),
     `flow/waiting-for-app-build` (post-merge RN-only change, not testable until
     the native app build ships)
2. **A "🧍 Needs human intervention" line** reporting how many open issues in
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
3. **A "Stats generated at" line** with the UTC timestamp of the refresh.

**Burndown detail (current mode only).** Each issue's stage history is
reconstructed from its `/timeline` label events (`flow/*` labels are exclusive,
so the latest flow event wins; the issue's current label is the authoritative
end-of-timeline state). The `|` marker in each bar shows that day's ideal count
(linear from the window's first day to 0 on the due date). Scope changes
(issues moved in/out during the window) are not reflected in the burndown.
**Future milestones** skip the timeline fetch entirely — their single bar is a
snapshot of each open issue's current label, so it is generated quickly.

## Script

One script lives in this skill directory:

### `generate-stats.py` — stats table + burndown chart

```bash
python3 .agents/skills/generate-milestone-stats/generate-stats.py --milestone-id <ID>
```

Fetches only the target milestone's issues via the plural
`?milestones=<id>` issue filter (the singular `?milestone=<id>` is broken on
this server — it ignores the parameter and returns every issue), classifies
the milestone, then renders the chart (burndown for current, snapshot bar for
future) and the "needs human intervention" line. In current mode each issue's
stage history comes from its `/timeline` label events; in future mode only the
issue list is read. Past milestones are left untouched. Writes the description
via `PATCH /milestones/{id}`. Pass `--dry-run` to print the description without
updating the milestone.

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
