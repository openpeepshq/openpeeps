#!/usr/bin/env python3
"""
Stats + burndown for a Gitea/Forgejo milestone.

Produces a milestone description containing:
  1. A stats table categorizing OPEN issues into:
     - To be worked on (no flow/* label)
     - To be reworked (flow/ready-to-rework)
     - To be tested (flow/ready-to-test)
  2. A burndown chart for the 7 days before the milestone due date, counting
     currently-scoped issues that were still open at end of each day and
     splitting each day's total across four pipeline stages:
       - pre-planning   (unlabeled / needs-specs / ready-to-schedule)
       - planning       (ready-to-plan / ready-to-review-plan)
       - implementation (ready-to-implement / ready-to-review / ready-to-rework /
                         ready-to-replan / ready-to-merge / merge-accepted)
       - testing        (ready-to-test / on-test-instance / waiting-for-app-build)

     Each issue's stage history is reconstructed from its `/timeline` label
     events. `flow/*` labels are exclusive, so the latest flow event wins.

Closed issues are ignored in the stats table; the burndown uses the open/closed
timeline of the current milestone scope.

Usage:
    python3 generate-stats.py --milestone-id 23
    python3 generate-stats.py --milestone-id 23 --token <token>
    python3 generate-stats.py --milestone-id 23 --dry-run

The token defaults to the FORGEJO_TOKEN environment variable.
"""

import argparse
import json
import os
import urllib.request
from datetime import date, timedelta

BASE = "https://code.openpeeps.org/api/v1/repos/openpeeps/openpeeps"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Update a milestone description with open-issue stats and a burndown chart."
    )
    parser.add_argument(
        "--milestone-id", type=int, required=True, help="Numeric id of the target milestone"
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("FORGEJO_TOKEN"),
        help="Forgejo API token (default: $FORGEJO_TOKEN)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the description but do not PATCH the milestone.",
    )
    args = parser.parse_args()
    if not args.token:
        parser.error("token is required: pass --token or set FORGEJO_TOKEN")
    return args


_args = parse_args()
TOKEN = _args.token
MILESTONE_ID = _args.milestone_id

# Burndown stages, in pipeline order. Every issue with a flow label maps to
# exactly one; unlabeled issues are pre-planning (the intake backlog).
STAGE_PRE = "pre-planning"
STAGE_PLAN = "planning"
STAGE_IMPL = "implementation"
STAGE_TEST = "testing"
STAGES = [STAGE_PRE, STAGE_PLAN, STAGE_IMPL, STAGE_TEST]

STAGE_OF_LABEL = {
    STAGE_PRE: {"flow/needs-specs", "flow/ready-to-schedule"},
    STAGE_PLAN: {"flow/ready-to-plan", "flow/ready-to-review-plan"},
    STAGE_IMPL: {
        "flow/ready-to-implement",
        "flow/ready-to-review",
        "flow/ready-to-rework",
        "flow/ready-to-replan",
        "flow/ready-to-merge",
        "flow/merge-accepted",
    },
    STAGE_TEST: {"flow/ready-to-test", "flow/on-test-instance", "flow/waiting-for-app-build"},
}
LABEL_TO_STAGE = {lbl: stage for stage, lbls in STAGE_OF_LABEL.items() for lbl in lbls}

STAGE_GLYPH = {STAGE_PRE: "░", STAGE_PLAN: "▒", STAGE_IMPL: "▓", STAGE_TEST: "█"}


def api_get(url):
    headers = {"Authorization": f"token {TOKEN}"}
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def api_patch(url, data):
    headers = {"Content-Type": "application/json", "Authorization": f"token {TOKEN}"}
    body = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(url, data=body, headers=headers, method="PATCH")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def parse_date(s):
    if not s:
        return None
    return date.fromisoformat(s[:10])


# --- Fetch all milestone items (open + closed) for the burndown ---
print("Fetching milestone items...")
all_items = {}
for page in range(1, 50):
    data = api_get(
        f"{BASE}/issues?limit=100&state=all&sort=created&order=desc&page={page}"
    )
    if not data:
        break
    for i in data:
        if i.get("milestone") and i["milestone"].get("id") == MILESTONE_ID:
            all_items[i["number"]] = i
print(f"Found {len(all_items)} items (open + closed)")

# --- Fetch the milestone metadata for the due date ---
url = f"{BASE}/milestones/{MILESTONE_ID}"
req = urllib.request.Request(url)
with urllib.request.urlopen(req) as resp:
    milestone = json.loads(resp.read().decode())
due_date = parse_date(milestone.get("due_on"))
print(f"Due date: {due_date}")

# --- Build the burndown ---
# 7 days before the due date, inclusive of the due date.
if due_date is None:
    due_date = date.today()
end = due_date
start = end - timedelta(days=7)


def fetch_timeline(num):
    """All timeline events for an issue, deduplicated and in id (chronological) order.

    The /timeline endpoint paginates with an overlap quirk (the next page
    re-returns the tail of the previous one), so events are keyed by id and the
    walk stops as soon as a page yields nothing new.
    """
    seen = {}
    order = []
    for page in range(1, 40):
        try:
            batch = api_get(f"{BASE}/issues/{num}/timeline?limit=100&page={page}")
        except Exception:
            break
        if not isinstance(batch, list) or not batch:
            break
        fresh = 0
        for ev in batch:
            # Forgejo occasionally returns a bare null entry for event types it
            # cannot serialize (seen on issue #1539); skip it rather than crash.
            if ev is None:
                continue
            eid = ev.get("id")
            if eid is not None and eid not in seen:
                seen[eid] = ev
                order.append(eid)
                fresh += 1
        if len(batch) < 100 or fresh == 0:
            break
    return [seen[eid] for eid in order]


def stage_segments(num, created_date, current_labels):
    """Ordered list of (date, stage) for the issue's pipeline history.

    Baseline is pre-planning at the issue's creation date; each flow-label
    event moves it to that label's stage. `flow/*` labels are exclusive, so the
    latest flow event is the issue's stage at that time. The issue's current
    flow label is the authoritative end-of-timeline state, so if the last
    event no longer matches it (a label change in flight between the issue
    list and its timeline fetch), a final segment snaps it back for today on.
    """
    segs = [(created_date or date.min, STAGE_PRE)]
    for ev in fetch_timeline(num):
        if ev.get("type") != "label":
            continue
        name = (ev.get("label") or {}).get("name") or ""
        stage = LABEL_TO_STAGE.get(name)
        when = parse_date(ev.get("created_at"))
        if stage is not None and when is not None:
            segs.append((when, stage))
    current_stage = next(
        (LABEL_TO_STAGE[l] for l in current_labels if l in LABEL_TO_STAGE), None
    )
    if current_stage is not None and segs[-1][1] != current_stage:
        segs.append((date.today(), current_stage))
    return segs


print("Reconstructing stage histories from issue timelines...")
histories = {}  # issue number -> [(date, stage), ...]
for num in sorted(all_items.keys()):
    i = all_items[num]
    current_labels = [l["name"] for l in i.get("labels", [])]
    histories[num] = stage_segments(num, parse_date(i.get("created_at")), current_labels)
print(f"  ({len(histories)} issues)")

# Per issue: created date, closed date (open-ness window).
open_meta = {
    num: (parse_date(i.get("created_at")), parse_date(i.get("closed_at")))
    for num, i in all_items.items()
}


def stage_of_at(segs, day):
    """Stage the issue is in at end of `day` (last segment dated <= day)."""
    stage = segs[0][1]
    for when, s in segs:
        if when is not None and when <= day:
            stage = s
        else:
            break
    return stage


def stage_counts_on(day):
    """Counts of open issues per stage at end of `day` (current milestone scope)."""
    counts = {s: 0 for s in STAGES}
    for num, (created, closed) in open_meta.items():
        if created is None or created > day:
            continue
        if closed is not None and closed <= day:
            continue
        counts[stage_of_at(histories[num], day)] += 1
    return counts


days = [start + timedelta(days=k) for k in range((end - start).days + 1)]
day_stage_counts = [stage_counts_on(d) for d in days]
open_counts = [sum(c.values()) for c in day_stage_counts]
first_count = open_counts[0] if open_counts else 0

print(f"\nBurndown ({start} -> {end}):")
for d, c in zip(days, day_stage_counts):
    print(
        f"  {d}  open={sum(c.values())}  " + "  ".join(f"{s}={c[s]}" for s in STAGES)
    )

# --- Render the burndown as an ASCII chart ---
max_count = max(open_counts) if open_counts else 1
bar_width = 28


def bar(counts):
    widths = [round(counts[s] / max_count * bar_width) if max_count else 0 for s in STAGES]
    widths[0] += bar_width - sum(widths)  # absorb rounding into the first segment
    widths = [max(0, w) for w in widths]
    return "".join(STAGE_GLYPH[s] * widths[i] for i, s in enumerate(STAGES))


# Ideal: linear from first_count on `start` to 0 on `end`.
def ideal_on(d):
    if end == start:
        return 0
    frac = (d - start).days / (end - start).days
    return round(first_count * (1 - frac))


chart_lines = ["```"]
chart_lines.append(
    f"Open issues  (max={max_count})"
    "  ░ pre-planning  ▒ planning  ▓ implementation  █ testing"
)
chart_lines.append("")
today = date.today()
for d, counts in zip(days, day_stage_counts):
    ideal = ideal_on(d)
    ib = "·" * round(ideal / max_count * bar_width) if max_count else ""
    if d > today:
        # Future date: only show the ideal line, no actual bar.
        chart_lines.append(
            f"{d.isoformat()}   —  {' ' * bar_width}  ideal {ideal:>3} {ib}"
        )
    else:
        b = bar(counts)
        chart_lines.append(f"{d.isoformat()}  {sum(counts.values()):>3} {b}  ideal {ideal:>3} {ib}")
chart_lines.append("```")

# Open issues that currently need human intervention (awaiting a human gate).
NEEDS_HUMAN = [
    ("ready-to-schedule", "flow/ready-to-schedule"),
    ("ready-to-review-plan", "flow/ready-to-review-plan"),
    ("ready-to-merge", "flow/ready-to-merge"),
    ("ready-to-test", "flow/ready-to-test"),
]
human_counts = {}
for i in all_items.values():
    if i["state"] != "open":
        continue
    labels = [l["name"] for l in i.get("labels", [])]
    for key, lbl in NEEDS_HUMAN:
        if lbl in labels:
            human_counts[key] = human_counts.get(key, 0) + 1
human_line = (
    f"🧍 Needs human intervention: "
    + " · ".join(f"{key} {human_counts.get(key, 0)}" for key, _ in NEEDS_HUMAN)
    + f" (total {sum(human_counts.values())})"
)

burndown_section = [
    f"## Burndown ({start.isoformat()} to {end.isoformat()})",
    "",
    *chart_lines,
    "",
    human_line,
    "",
    f"> Counts issues currently in the milestone that were still open at end of each day, "
    f"split by pipeline stage from each issue's `flow/*` label history: "
    f"░ pre-planning (unlabeled / `needs-specs` / `ready-to-schedule`), "
    f"▒ planning (`ready-to-plan` / `ready-to-review-plan`), "
    f"▓ implementation (`ready-to-implement` through `merge-accepted`), "
    f"█ testing (`ready-to-test` / `on-test-instance` / `waiting-for-app-build`). "
    f"Ideal line: linear from {first_count} on {start.isoformat()} to 0 on {end.isoformat()}. "
    f"Scope changes (issues moved in/out of the milestone during the window) are not reflected.",
]

desc = "\n".join(burndown_section)
print(f"\n=== Description ({len(desc)} chars) ===")
print(desc)

# --- Update milestone ---
if _args.dry_run:
    print("\nDRY RUN: not updating milestone.")
else:
    print("\n=== Updating milestone description ===")
    result = api_patch(
        url,
        {
            "title": milestone["title"],
            "state": milestone["state"],
            "description": desc,
            "due_on": milestone.get("due_on"),
        },
    )
    print(f"SUCCESS: {len(result.get('description', ''))} chars")
