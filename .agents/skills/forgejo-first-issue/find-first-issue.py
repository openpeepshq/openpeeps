#!/usr/bin/env python3
"""Fetch the first open issue matching one or more labels from openpeeps/openpeeps.

Usage:
    python3 find-first-issue.py --label flow/ready-to-implement
    python3 find-first-issue.py --label flow/ready-to-review --label in-progress
    python3 find-first-issue.py --label flow/ready-to-implement --exclude-label in-progress
    python3 find-first-issue.py --label flow/ready-to-implement --sort updated --order desc --json

Output: one compact issue block (number, title, url, created, assignee, labels)
plus a total count, or the full issue JSON with --json.
Exit code: 0 when at least one matching issue exists, 1 when none.
"""
import argparse
import json
import os
import sys
import urllib.parse
import urllib.request

BASE = "https://code.openpeeps.org/api/v1/repos/openpeeps/openpeeps"
PAGE_LIMIT = 50  # this Forgejo instance silently caps page size at 50


def parse_args():
    parser = argparse.ArgumentParser(description="First open issue with the given label(s).")
    parser.add_argument("--label", action="append", default=[],
                        help="Issue must have ALL of these labels (repeatable).")
    parser.add_argument("--exclude-label", action="append", default=[],
                        help="Issue must have NONE of these labels (repeatable, e.g. in-progress).")
    parser.add_argument("--sort", default="created",
                        help="created | updated | title | comments (default: created)")
    parser.add_argument("--order", default="asc", choices=["asc", "desc"],
                        help="asc = oldest first, the default")
    parser.add_argument("--json", action="store_true", help="print the full issue JSON")
    parser.add_argument("--token", default=os.environ.get("FORGEJO_TOKEN"),
                        help="Forgejo API token (default: $FORGEJO_TOKEN)")
    args = parser.parse_args()
    if not args.label:
        parser.error("at least one --label is required")
    if not args.token:
        parser.error("token is required: pass --token or set FORGEJO_TOKEN")
    return args


_args = parse_args()
TOKEN = _args.token
WANT = set(_args.label)
EXCLUDE = set(_args.exclude_label)


def api_get(url):
    req = urllib.request.Request(url, headers={"Authorization": f"token {TOKEN}"})
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode()), resp.headers


def collect(page=1):
    """One page of open issues; returns (issues, total, server_capped)."""
    q = urllib.parse.urlencode({
        "state": "open",
        "labels": ",".join(sorted(WANT)),
        "sort": _args.sort,
        "order": _args.order,
        "page": page,
        "limit": PAGE_LIMIT,
    })
    issues, headers = api_get(f"{BASE}/issues?{q}")
    if not isinstance(issues, list):
        sys.exit(f"unexpected response (label unknown or API error): {json.dumps(issues)[:200]}")
    total = int(headers.get("X-Total-Count", "0") or 0)
    # Gitea pagination bug: filtered results silently stop at 50 with no further pages.
    capped = len(issues) < PAGE_LIMIT
    return issues, total, capped


def main():
    issues, total, capped = collect(1)
    while len(issues) < total and not capped:
        more, _, capped = collect(len(issues) // PAGE_LIMIT + 1)
        issues += more
    # Belt and braces: re-check label sets client-side (server filter can be incomplete).
    issues = [i for i in issues
              if WANT <= {l["name"] for l in i.get("labels", [])}
              and not (EXCLUDE & {l["name"] for l in i.get("labels", [])})]
    if not issues:
        print("No open issue matches " + " and ".join(sorted(WANT))
              + (f" (excluding {sorted(EXCLUDE)})" if EXCLUDE else "") + ".")
        sys.exit(1)
    if _args.json:
        print(json.dumps(issues[0], indent=2))
        return
    i = issues[0]
    assignee = i.get("assignee")
    print(f"FOUND {len(issues)} open issue(s) with "
          + " and ".join(sorted(WANT))
          + (f", excluding {sorted(EXCLUDE)}" if EXCLUDE else "")
          + f" — first by {_args.sort} {_args.order}:")
    print(f"  number:  {i['number']}")
    print(f"  title:   {i['title']}")
    print(f"  url:     {i['html_url']}")
    print(f"  created: {i['created_at']}  state={i['state']}")
    print(f"  assignee: {assignee['login'] if assignee else '-'}")
    print(f"  labels:  {', '.join(l['name'] for l in i.get('labels', []))}")


main()
