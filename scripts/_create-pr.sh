#!/bin/sh
set -e
echo "=== Step 1: Align main with remote ==="
git --no-pager fetch origin
git branch -f main origin/main

echo ""
echo "=== Step 2: Create feature branch ==="
git checkout -b feat/lint-prettier-fixes main

echo ""
echo "=== Step 3: Add all changes ==="
git add -A

echo ""
echo "=== Step 4: Commit ==="
file_count=$(git diff --cached --name-only | wc -l)
echo "Files changed: $file_count"

echo ""
echo "=== Step 5: Squash and sign ==="
GIT_EDITOR=true git commit -m "feat(lint): fix eslint and prettier errors across all packages

- Prettier: format ~240 source files; single root .prettierrc/.prettierignore
- Migrate 13 eslint configs from .eslintrc.cjs to eslint.config.js (flat config)
- Upgrade ESLint 9->10, TypeScript 5.7->6.0, @typescript-eslint->8.72.0
- Fix all ESLint errors (800+ -> 0) across 10 packages
- Add ESLint to platform/rn-components (previously unconfigured)
- Remove eslint-plugin-jsx-a11y (incompatible with ESLint 10)
- Sync ESLint/TS/@typescript-eslint versions across all packages
- CI: add lint job; test-gate depends on lint
- Fix test-gate to use explicit needs result checks

Signed-off-by: Agent"

echo ""
echo "=== Step 6: Verify ==="
git --no-pager log --oneline -2

echo ""
echo "=== Step 7: Run CI gate ==="
node scripts/check-branch.mjs
