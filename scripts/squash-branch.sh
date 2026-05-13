#!/usr/bin/env bash
#
# Squash all commits on the current branch that are not in the default branch
# into a single commit. Opens the user's editor for the new commit message.
#
# Usage: ./scripts/squash-branch.sh [--ci] [-m "message"]
#   --ci  Non-interactive: commit without opening an editor.
#         If at most one commit exists ahead of the default branch and no
#         message is given (neither -m nor SQUASH_MESSAGE), exit 0 without
#         changing history (avoids automation loops after a force-push).
#         With -m or SQUASH_MESSAGE, always rebuilds that tip commit using the
#         given subject (even when only one commit ahead).
#   -m    Commit message for the squashed commit (CI only; overrides
#         SQUASH_MESSAGE when both are set).
#         Non-CI mode does not accept -m (use the editor after squash).
# Base branch: main (override with DEFAULT_BRANCH env).
#
# Requires: clean working tree (no uncommitted changes).

set -e

CI_MODE=0
ARG_MSG=""
while [ $# -gt 0 ]; do
  case "$1" in
    --ci)
      CI_MODE=1
      shift
      ;;
    -m)
      if [ -z "${2:-}" ]; then
        echo "Option -m requires a message." >&2
        exit 1
      fi
      ARG_MSG="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
  esac
done

SQUASH_MESSAGE="${ARG_MSG:-${SQUASH_MESSAGE:-}}"

if [ "$CI_MODE" -eq 0 ] && [ -n "$SQUASH_MESSAGE" ]; then
  echo "Option -m / SQUASH_MESSAGE is only supported with --ci." >&2
  exit 1
fi

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
  if [ "$CI_MODE" -eq 1 ]; then
    exit 0
  fi
  exit 1
fi

N=$(git rev-list --count "$BASE"..HEAD)
if [ "$CI_MODE" -eq 1 ] && [ "$N" -eq 1 ] && [ -z "$SQUASH_MESSAGE" ]; then
  echo "Only one commit ahead of '$DEFAULT_BRANCH'; nothing to squash (CI skip)." >&2
  exit 0
fi

if [ "$CI_MODE" -eq 1 ] && [ -n "$SQUASH_MESSAGE" ]; then
  echo "Squashing $N commit(s) into one (non-interactive, custom message)."
  git reset --soft "$BASE"
  exec git commit -m "$SQUASH_MESSAGE"
fi

if [ "$CI_MODE" -eq 1 ]; then
  echo "Squashing $N commit(s) into one (non-interactive)."
else
  echo "Squashing $N commit(s) into one (editor will open for the new message)."
fi

# Capture commit messages (oldest first) before reset; %s = subject, %b = body
MSG_FILE=$(mktemp) || { echo "mktemp failed." >&2; exit 1; }
trap 'rm -f "$MSG_FILE"' EXIT
git log --reverse "$BASE"..HEAD --pretty=format:"%s%n%b%n" > "$MSG_FILE"

git reset --soft "$BASE"
if [ "$CI_MODE" -eq 1 ]; then
  exec git commit -F "$MSG_FILE"
else
  exec git commit -e -F "$MSG_FILE"
fi
