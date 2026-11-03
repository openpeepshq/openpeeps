#!/usr/bin/env python3
"""
Stats + burndown for a Gitea/Forgejo milestone.

Produces a milestone description containing:
  1. A stats table categorizing OPEN issues into:
     - To be worked on (no flow/* label)
     - To be reworked (flow/rework)
     - To be tested (flow/ready-to-test)
  2. A burndown chart for the 7 days before the milestone due date,
     counting currently-scoped issues that were still open at end of each day.

Closed issues are ignored in the stats table; the burndown uses open/closed
timeline of the current milestone scope.
"""

import json
import urllib.request
from datetime import date, timedelta

BASE = "https://code.openpeeps.org/api/v1/repos/openpeeps/openpeeps"
TOKEN = "REDACTED"
MILESTONE_ID = 23

FLOW_LABELS = [
    "flow/ready-to-test",
    "flow/rework",
    "flow/on-test-instance",
    "flow/waiting-for-app-build",
]
LABEL_READY = "flow/ready-to-test"
LABEL_REWORK = "flow/rework"


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
    # Fall back to today + 7 days if no due date.
    due_date = date.today()
end = due_date
start = end - timedelta(days=7)

# For each issue in the current scope, determine open/closed dates and the date
# the `flow/ready-to-test` label was first added (from issue events), so the
# burndown bar can split each day's open count into "still working" vs "ready".
# Resolve the ready-to-test org label id once to match label events.
ready_label_id = None
try:
    org_labels = api_get(
        f"https://code.openpeeps.org/api/v1/orgs/openpeeps/labels?limit=100"
    )
    for lbl in org_labels or []:
        if lbl.get("name") == LABEL_READY:
            ready_label_id = lbl.get("id")
            break
except Exception as e:
    print(f"  (could not fetch org labels: {e})")
print(f"Ready-to-test label id: {ready_label_id}")

print("Fetching label-added dates from issue events...")
ready_added_on = {}  # issue number -> date the ready-to-test label was added
for num in sorted(all_items.keys()):
    added = None
    # Try the issue events endpoint for label events.
    for page in range(1, 10):
        try:
            events = api_get(f"{BASE}/issues/{num}/events?limit=100&page={page}")
        except Exception:
            events = None
        if not events:
            break
        for ev in events:
            if ev.get("type") in ("label_updated", "label", "label_added") or (
                ev.get("label") is not None
            ):
                lbl = ev.get("label") or {}
                # Match by id (preferred) or by name.
                matches = (
                    ready_label_id is not None and lbl.get("id") == ready_label_id
                ) or lbl.get("name") == LABEL_READY
                if matches:
                    when = parse_date(ev.get("created_at"))
                    if when is not None and (added is None or when < added):
                        added = when
    ready_added_on[num] = added

# Fallback: if no event date was found but the issue currently has the label,
# treat the label as present since the issue's creation date (conservative).
for num, i in all_items.items():
    current_labels = [l["name"] for l in i.get("labels", [])]
    if LABEL_READY in current_labels and ready_added_on.get(num) is None:
        ready_added_on[num] = parse_date(i.get("created_at"))

open_timeline = []
for i in all_items.values():
    created = parse_date(i.get("created_at"))
    closed = parse_date(i.get("closed_at"))
    open_timeline.append((created, closed))


# Count open issues at end of each day in [start, end], and among those how
# many had the `flow/ready-to-test` label by that day.
def open_count_on(day):
    return sum(
        1
        for idx, (created, closed) in enumerate(open_timeline)
        if created is not None and created <= day and (closed is None or closed > day)
    )


def ready_count_on(day):
    total = 0
    for num, i in all_items.items():
        created = parse_date(i.get("created_at"))
        closed = parse_date(i.get("closed_at"))
        if created is None or created > day:
            continue
        if closed is not None and closed <= day:
            continue
        when = ready_added_on.get(num)
        if when is not None and when <= day:
            total += 1
    return total


days = [start + timedelta(days=k) for k in range((end - start).days + 1)]
open_counts = [open_count_on(d) for d in days]
ready_counts = [ready_count_on(d) for d in days]
working_counts = [o - r for o, r in zip(open_counts, ready_counts)]
first_count = open_counts[0] if open_counts else 0

print(f"\nBurndown ({start} -> {end}):")
for d, o, r in zip(days, open_counts, ready_counts):
    print(f"  {d}  open={o}  ready={r}  working={o - r}")

# --- Render the burndown as an ASCII chart ---
# Solid block for the "still working" portion, light shade for "ready to test".
max_count = max(open_counts) if open_counts else 1
bar_width = 30


def bar(working, ready):
    w = round(working / max_count * bar_width) if max_count else 0
    r = round(ready / max_count * bar_width) if max_count else 0
    return "█" * w + "░" * r


# Ideal: linear from first_count on `start` to 0 on `end`.
def ideal_on(d):
    if end == start:
        return 0
    frac = (d - start).days / (end - start).days
    return round(first_count * (1 - frac))


chart_lines = ["```"]
chart_lines.append(f"Open issues  (max={max_count})  █ working  ░ ready-to-test")
chart_lines.append("")
today = date.today()
for d, o, r in zip(days, open_counts, ready_counts):
    ideal = ideal_on(d)
    ib = "·" * round(ideal / max_count * bar_width) if max_count else ""
    if d > today:
        # Future date: only show the ideal line, no actual bar.
        chart_lines.append(
            f"{d.isoformat()}   —  {' ' * bar_width}  ideal {ideal:>3} {ib}"
        )
    else:
        b = bar(o - r, r)
        chart_lines.append(f"{d.isoformat()}  {o:>3} {b}  ideal {ideal:>3} {ib}")
chart_lines.append("```")

burndown_section = [
    "",
    f"## Burndown ({start.isoformat()} to {end.isoformat()})",
    "",
    *chart_lines,
    "",
    f"> Counts issues currently in the milestone that were still open at end of each day. "
    f"Solid █ = still being worked on; light ░ = already marked `flow/ready-to-test`. "
    f"Ideal line: linear from {first_count} on {start.isoformat()} to 0 on {end.isoformat()}. "
    f"Scope changes (issues moved in/out of the milestone during the window) are not reflected.",
]

# --- Stats table (open issues only) ---
open_items = [i for i in all_items.values() if i["state"] == "open"]

to_do = []
to_test = []
to_rework = []
for num, i in sorted(((i["number"], i) for i in open_items), key=lambda x: x[0]):
    labels = [l["name"] for l in i.get("labels", [])]
    has_flow = any(l in labels for l in FLOW_LABELS)
    assignee = i.get("assignee")
    a = assignee.get("login", "") if isinstance(assignee, dict) else ""
    if LABEL_READY in labels:
        to_test.append((num, a))
    elif LABEL_REWORK in labels:
        to_rework.append((num, a))
    elif not has_flow:
        to_do.append((num, a))


def counts(lst):
    return len(lst), sum(1 for _, a in lst if a), sum(1 for _, a in lst if not a)


todo_total, todo_asn, todo_unasn = counts(to_do)
test_total, test_asn, test_unasn = counts(to_test)
rework_total, rework_asn, rework_unasn = counts(to_rework)

stats_lines = [
    "| Metric | To be worked on | To be reworked | To be tested |",
    "|--------|-----------------|----------------|--------------|",
    f"| Total (open) | {todo_total} | {rework_total} | {test_total} |",
    f"| Assigned | {todo_asn} | {rework_asn} | {test_asn} |",
    f"| Unassigned | {todo_unasn} | {rework_unasn} | {test_unasn} |",
]

desc = "\n".join(stats_lines + burndown_section)
print(f"\n=== Description ({len(desc)} chars) ===")
print(desc)

# --- Update milestone ---
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
