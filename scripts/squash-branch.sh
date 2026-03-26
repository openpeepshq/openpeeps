#!/usr/bin/env bash
#
# Squash all commits on the current branch that are not in the default branch
# into a single commit. Opens the user's editor for the new commit message.
#
# Usage: ./scripts/squash-branch.sh
# Base branch: main (override with DEFAULT_BRANCH env).
#
# Requires: clean working tree (no uncommitted changes).

set -e

DEFAULT_BRANCH="${DEFAULT_BRANCH:-main}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Not inside a git repository." >&2
  exit 1
fi

if ! git diff-index --quiet HEAD -- 2>/dev/null; then
  echo "Working tree has uncommitted changes. Commit or stash them first." >&2
  exit 1
fi

CURRENT="$(git rev-parse HEAD)"
BASE="$(git merge-base "$DEFAULT_BRANCH" HEAD 2>/dev/null)" || {
  echo "Could not find merge base with '$DEFAULT_BRANCH'. Does that branch exist?" >&2
  exit 1
}

if [ "$CURRENT" = "$BASE" ]; then
  echo "Current branch has no commits ahead of '$DEFAULT_BRANCH'. Nothing to squash." >&2
  exit 1
fi

N=$(git rev-list --count "$BASE"..HEAD)
echo "Squashing $N commit(s) into one (editor will open for the new message)."

# Capture commit messages (oldest first) before reset; %s = subject, %b = body
MSG_FILE=$(mktemp) || { echo "mktemp failed." >&2; exit 1; }
trap 'rm -f "$MSG_FILE"' EXIT
git log --reverse "$BASE"..HEAD --pretty=format:"%s%n%b%n" > "$MSG_FILE"

git reset --soft "$BASE"
exec git commit -e -F "$MSG_FILE"
