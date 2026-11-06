#!/usr/bin/env python3
"""
For each milestone issue:
  1. Find merged PRs referencing it
  2. Find the issue's last comment date
  3. If a merged PR was merged AFTER the last comment, add flow/ready-to-test label
Then re-run the triage stats.

Usage:
    python3 find-ready-to-test.py --milestone-id 23
    python3 find-ready-to-test.py --milestone-id 23 --token <token>

The token defaults to the FORGEJO_TOKEN environment variable.
"""
import argparse
import json
import os
import urllib.request
import re
from collections import defaultdict

BASE = "https://code.openpeeps.org/api/v1/repos/openpeeps/openpeeps"


def parse_args():
    parser = argparse.ArgumentParser(
        description="Label milestone issues as flow/ready-to-test when their PRs were merged after the last comment."
    )
    parser.add_argument(
        "--milestone-id", type=int, required=True, help="Numeric id of the target milestone"
    )
    parser.add_argument(
        "--token",
        default=os.environ.get("FORGEJO_TOKEN"),
        help="Forgejo API token (default: $FORGEJO_TOKEN)",
    )
    args = parser.parse_args()
    if not args.token:
        parser.error("token is required: pass --token or set FORGEJO_TOKEN")
    return args


_args = parse_args()
TOKEN = _args.token
MILESTONE_ID = _args.milestone_id
LABEL_READY = "flow/ready-to-test"

def api_get(url):
    headers = {'Authorization': f'token {TOKEN}'}
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req) as resp:
            return json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise

def api_post(url, data):
    headers = {'Content-Type': 'application/json', 'Authorization': f'token {TOKEN}'}
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def api_patch(url, data):
    headers = {'Content-Type': 'application/json', 'Authorization': f'token {TOKEN}'}
    body = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=body, headers=headers, method='PATCH')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

# --- Step 1: Fetch all milestone items (all states) ---
print(f"=== Fetching milestone {MILESTONE_ID} items ===")
milestone_items = {}
for page in range(1, 50):
    data = api_get(f"{BASE}/issues?limit=100&state=all&sort=created&order=desc&page={page}")
    if not data:
        break
    for i in data:
        if i.get('milestone') and i['milestone'].get('id') == MILESTONE_ID:
            milestone_items[i['number']] = i
print(f"Found {len(milestone_items)} items (open + closed)")

# --- Step 2: Fetch all PRs ---
print("=== Fetching all PRs ===")
all_prs = {}
for page in range(1, 30):
    data = api_get(f"{BASE}/pulls?limit=100&state=all&sort=created&order=desc&page={page}")
    if not data:
        break
    for pr in data:
        all_prs[pr['number']] = pr
print(f"Found {len(all_prs)} PRs ({sum(1 for p in all_prs.values() if p.get('merged'))} merged)")

# --- Step 3: Build issue -> merged PRs mapping ---
print("=== Building issue -> merged PR references ===")
issue_to_prs = defaultdict(list)
for pr in all_prs.values():
    if not pr.get('merged'):
        continue
    body = pr.get('body', '') or ''
    title = pr.get('title', '') or ''
    combined = body + '\n' + title
    refs = set()
    for ref in re.findall(r'#(\d+)', combined):
        try:
            refs.add(int(ref))
        except ValueError:
            pass
    for ref in re.findall(r'/issues/(\d+)', combined):
        try:
            refs.add(int(ref))
        except ValueError:
            pass
    for ref_num in refs:
        if ref_num in milestone_items:
            issue_to_prs[ref_num].append({
                'pr_number': pr['number'],
                'merged_at': pr.get('merged_at'),
                'title': pr['title'][:80],
            })

print(f"Issues with merged PR references: {len(issue_to_prs)}")

# --- Step 4: For each issue, find last comment date and check condition ---
print("\n=== Checking last comment vs PR merge date ===")
newly_labeled = []
already_labeled = []
skipped_no_pr = []
skipped_pr_before_comment = []

for num in sorted(milestone_items.keys()):
    issue = milestone_items[num]
    current_labels = [l['name'] for l in issue.get('labels', [])]

    # Skip if already has the label
    if LABEL_READY in current_labels:
        already_labeled.append(num)
        continue

    # Get merged PRs for this issue
    prs = issue_to_prs.get(num, [])
    if not prs:
        skipped_no_pr.append(num)
        continue

    # Get last comment date
    comments = api_get(f"{BASE}/issues/{num}/comments") or []
    last_comment_date = None
    if comments:
        # Find the latest comment by created_at
        last_comment_date = max(c.get('created_at', '') for c in comments if c.get('created_at'))

    # If no comments, use the issue creation date as the baseline
    if last_comment_date is None:
        last_comment_date = issue.get('created_at', '1970-01-01T00:00:00Z')

    # Check if any merged PR was merged after the last comment
    merged_after_comment = [p for p in prs if p['merged_at'] and p['merged_at'] > last_comment_date]

    if merged_after_comment:
        # Add the label
        try:
            api_post(f"{BASE}/issues/{num}/labels", {"labels": [LABEL_READY]})
            newly_labeled.append(num)
            pr_info = ', '.join(f"#{p['pr_number']} (merged {p['merged_at'][:10]})" for p in merged_after_comment)
            print(f"  #{num}: labeled ready-to-test (PR {pr_info} merged after last comment {last_comment_date[:10]})")
        except Exception as e:
            print(f"  #{num}: FAILED to label - {e}")
    else:
        skipped_pr_before_comment.append(num)
        # Show details for debugging
        latest_pr = max(prs, key=lambda p: p['merged_at'] or '')
        print(f"  #{num}: skipped (latest PR #{latest_pr['pr_number']} merged {latest_pr['merged_at'][:10] if latest_pr['merged_at'] else 'N/A'}, last comment {last_comment_date[:10]})")

print(f"\n=== Summary ===")
print(f"Already labeled: {len(already_labeled)}")
print(f"Newly labeled: {len(newly_labeled)} -- {newly_labeled}")
print(f"Skipped (no PR): {len(skipped_no_pr)}")
print(f"Skipped (PR before comment): {len(skipped_pr_before_comment)}")
print(f"Total processed: {len(milestone_items)}")
