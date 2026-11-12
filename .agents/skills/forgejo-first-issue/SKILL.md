---
name: forgejo-first-issue
description: Find the first open issue with a specific label (e.g. a flow/* stage label) on code.openpeeps.org/openpeeps/openpeeps using the Forgejo API. Use at the start of any OpenPeeps automation that must pick an issue by label — intake, planning, implementation, code review, rework, merge-ready — instead of hand-rolling Forgejo pagination.
---

# Forgejo First Issue

Deterministically fetch the first open issue of `openpeeps/openpeeps` carrying a
given label (or combination of labels), without spending agent steps on ad-hoc
Forgejo API exploration. Uses the `FORGEJO_TOKEN` environment variable.

## Usage

```bash
# First (oldest) open issue with a single label
python3 .agents/skills/forgejo-first-issue/find-first-issue.py --label flow/ready-to-implement

# Issue must have ALL listed labels (AND semantics)
python3 .agents/skills/forgejo-first-issue/find-first-issue.py --label flow/ready-to-review --label in-progress

# Skip issues that already carry a label — the standard claiming-protocol filter
python3 .agents/skills/forgejo-first-issue/find-first-issue.py --label flow/ready-to-implement --exclude-label in-progress

# Newest-first instead of oldest-first
python3 .agents/skills/forgejo-first-issue/find-first-issue.py --label flow/ready-to-implement --sort updated --order desc
```

Run the script from the repository root so the relative path resolves.

### Options

| Flag | Meaning |
|---|---|
| `--label` (repeatable) | Issue must have **all** of these labels |
| `--exclude-label` (repeatable) | Issue must have **none** of these |
| `--sort` | `created` (default), `updated`, `title`, `comments` |
| `--order` | `asc` (default, oldest first), `desc` |
| `--json` | Print the full issue JSON instead of the summary |
| `--token` | Explicit token (defaults to `$FORGEJO_TOKEN`) |

### Output and exit codes

- **rc 0**: at least one match. Prints the match count and a compact block for
  the first match: `number`, `title`, `url`, `created`, `assignee`, `labels`.
- **rc 1**: no matching open issue. Prints a "No open issue matches …" line.
  For stage-picking automations this usually means *do nothing* — stop and
  finish the run, following the claiming protocol.
- **rc 2**: usage error (missing `--label`, no `FORGEJO_TOKEN`, …).

## Why a script (and gotchas it handles)

- This Forgejo instance **silently caps list results at 50 items per page** and
  the filtered `labels=` list can stop returning pages at 50 even when
  `X-Total-Count` says more exist. The script pagates and stops when the server
  caps, then re-filters client-side on exact label sets.
- Label filtering is done on the label **name** string; stage labels like
  `flow/ready-to-implement` are org-level and work in the `labels=` filter.
- A `404`/error response from the list endpoint (e.g. typo'd label) exits with a
  message instead of a traceback.
- Auth: `Authorization: token $FORGEJO_TOKEN`. Do not print or log the token.

## Typical automation flow

1. Run the script with the stage label (plus `--exclude-label in-progress`
   when the run must not re-claim work in flight).
2. On rc 1: finish the run, no action.
3. On rc 0: claim the returned issue number immediately per the claiming
   protocol (add `in-progress`, re-GET to verify), then proceed with the issue
   body via `GET .../issues/{number}`.
