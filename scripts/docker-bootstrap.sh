#!/usr/bin/env bash
#
# Shared buildkitd + buildx bootstrap for the image-build jobs
# (build-images and build-images-arm64 in .forgejo/workflows/build.yaml).
#
# Both jobs run in an ephemeral node:24-alpine container, but they share one
# persistent buildkitd container (named volume) on the runner host. Sourcing
# this script from both keeps the bootstrap a single source of truth instead
# of two hand-copied blocks that would drift.
#
# The script never exits on a transient problem: a stopped buildkitd is
# recreated, a missing/failed buildx record is retried for up to 30s (cold
# starts take a moment). Only a hard failure (docker unavailable, buildkitd
# still unreachable after 30s) exits non-zero, which fails the calling step.
#
# Usage (from a workflow step's `run: |` block):
#   . "$(git rev-parse --show-toplevel)/scripts/docker-bootstrap.sh"
#   docker_ensure_builder ci
#
# `docker_ensure_builder <name>` ensures the `buildkitd` container is running
# and (re)creates the named buildx builder pointed at it.
#
# Pinning: buildkitd runs the RELEASED tag below, not the floating
# `buildx-stable-1` alias. That alias is re-pointed whenever Docker ships a
# new buildx stable, so an unpinned runner would upgrade its buildkitd between
# two release pushes — changing the layer-cache format or the
# attestation-manifest behavior (buildx >= 0.36 exports attestation manifests
# by default) while the runner image's `docker-cli-buildx` stays where it is.
# A mid-flight engine change would fail the least-exercised leg (the arm64
# build) opaquely. Bump this pin deliberately, in lockstep with the runner
# image's `docker-cli-buildx` version.
# At this pin, `buildx-stable-1` and `v0.35.1` resolve to the same amd64
# image manifest digest (sha256:7583a0667093d941826bcd1d2878d6a360dfd08a82c93e6d6a6f6cce78801e12,
# verified against Docker Hub when this pin was set), so the switch from the
# floating alias is behavior-neutral today.
# Full semver release tag (vN.M.K): :latest, :main, a digest-only ref, or a
# partial tag like v0.35 are not release pins — check-ci-invariants.sh
# enforces this strict shape on the line below.
BUILDKIT_IMAGE="moby/buildkit:v0.35.1"

docker_ensure_builder() {
  local name="${1:-ci}"

  # Persistent builder (create-if-missing, never removed): buildkitd runs on
  # the runner host with a named volume, so its layer cache and the pnpm-store
  # cache mount survive across jobs AND across container recreation (docker
  # rm keeps named volumes). Recreate it only when missing, stopped, or
  # started with a different image than the pin — the last case is the one
  # time a pin bump takes effect on a runner that already has a buildkitd
  # (the named volume, and therefore the cache, survives the recreate).
  local current_image=""
  if docker inspect buildkitd >/dev/null 2>&1; then
    current_image="$(docker inspect -f '{{.Config.Image}}' buildkitd 2>/dev/null || true)"
  fi
  if [ "$current_image" != "${BUILDKIT_IMAGE}" ] || \
    [ "$(docker inspect -f '{{.State.Running}}' buildkitd 2>/dev/null || echo false)" != "true" ]; then
    docker rm -f buildkitd >/dev/null 2>&1 || true
    docker run -d --name buildkitd --privileged --network host \
      -v buildkit-cache:/var/lib/buildkit \
      "${BUILDKIT_IMAGE}"
  fi

  # The buildx CLI record is ephemeral (fresh job container each run);
  # recreate it each time — this never touches the buildkitd container or
  # its cache. create pings the daemon, so retry until buildkitd accepts
  # connections (cold starts take a moment).
  local create_ok=""
  local i
  for i in $(seq 1 30); do
    if docker buildx create --name "$name" --driver remote docker-container://buildkitd >/dev/null 2>&1; then
      create_ok="1"
      break
    fi
    docker buildx rm -f "$name" >/dev/null 2>&1 || true
    sleep 1
  done
  if [ -z "$create_ok" ]; then
    echo "Could not connect to buildkitd after 30s" >&2
    return 1
  fi
  return 0
}
