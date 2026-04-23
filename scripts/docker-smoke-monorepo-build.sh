#!/usr/bin/env zsh
# Reproduce the Forgejo "publish-packages" monorepo build: same image as the OpenPeeps
# app Dockerfile, then run a full pnpm install + pnpm -r build inside /apat.
#
# Usage (from monorepo root, which contains Dockerfile):
#   ./scripts/docker-smoke-monorepo-build.sh
#   pnpm run docker:smoke-monorepo-build
#
# Optional env:
#   OPENPEEPS_SMOKE_IMAGE_TAG  default: openpeeps:local-smoke-build
#   OPENPEEPS_DOCKER_PLATFORM  e.g. linux/amd64 to match Linux CI on Apple Silicon

emulate -R zsh
setopt errexit nounset pipefail

# Repo root = parent of this script's directory (works on macOS zsh and when pnpm runs a relative path)
typeset script_dir repo_root
script_dir="$(cd "$(dirname "$0")" && pwd -P)"
repo_root="$(cd "$script_dir/.." && pwd -P)"
cd "$repo_root"

typeset IMAGE_TAG="${OPENPEEPS_SMOKE_IMAGE_TAG:-openpeeps:local-smoke-build}"
typeset VERSION="${OPENPEEPS_SMOKE_VERSION:-local}"
typeset ENVIRONMENT="${OPENPEEPS_SMOKE_ENV:-local}"

typeset -a build_flags
typeset -a run_flags
if [[ -n "${OPENPEEPS_DOCKER_PLATFORM:-}" ]]; then
  build_flags=(--platform "$OPENPEEPS_DOCKER_PLATFORM")
  run_flags=(--platform "$OPENPEEPS_DOCKER_PLATFORM")
  print -r "Using --platform $OPENPEEPS_DOCKER_PLATFORM (CI is typically linux/amd64)"
fi

print -r "==> Building image: $IMAGE_TAG (repo: $repo_root)"
docker build "${build_flags[@]}" \
  --build-arg "VERSION=$VERSION" \
  --build-arg "ENVIRONMENT=$ENVIRONMENT" \
  -t "$IMAGE_TAG" \
  -f Dockerfile \
  .

# Same idea as .forgejo/workflows build.yaml publish-packages: override NODE_ENV so
# pnpm installs devDependencies, then build every workspace package.
print -r "==> docker run: cd /apat && pnpm install --prod=false && pnpm -r build"
# Inner shell: Alpine busybox sh has no "pipefail"; use plain -e
docker run "${run_flags[@]}" --rm \
  -e NODE_ENV=development \
  -e CI=true \
  -w /apat \
  --entrypoint sh \
  "$IMAGE_TAG" \
  -c 'set -e; pnpm install --prod=false && pnpm -r build'

print -r "==> OK: monorepo build finished successfully inside the OpenPeeps app image"
