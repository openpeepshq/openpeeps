#!/usr/bin/env bash
#
# Regression check for invariants of .forgejo/workflows/build.yaml (and
# scripts/docker-bootstrap.sh) that a plain diff review does not observe:
#
#   1. deploy-docker must keep depending on build-images-arm64. The multi-arch
#      guarantee lives in that single `needs` line: the arm64 job assembles the
#      multi-arch ${IMAGE}:${SHA} list, and deploy-docker's retags copy it into
#      :latest / version / tag. If the dependency were dropped, the retags
#      would silently copy a single-arch (amd64-only) tag — exactly the failure
#      this check guards against.
#   2. build-images-arm64 must NOT be a dependency of merge-gate (and its
#      failure must not be enumerated in merge-gate's detect-failures step).
#      The job is release-ref-only: it exits 0 immediately on every branch/PR
#      push, so it is intentionally absent from the gate. Adding it would
#      re-introduce a branch-push skip cascade — the failure class the
#      no-job-level-if design in build.yaml exists to avoid. A release-ref
#      failure still reds the workflow through deploy-docker's needs.
#   3. The arm64 skip guard must (a) read the RAW manifest
#      (`imagetools inspect --raw`) and count real image platforms via
#      `.platform.architecture`, filtering out attestations (jq), on its OWN
#      line; and (b) decide the skip by testing that architecture list with
#      `grep -q '^arm64$'` — i.e. skip ONLY when a real arm64 image is present.
#      Both checks are window-scoped to the `guard_archs` line (+ its decision
#      line), NOT file-global: the acceptance check carries an IDENTICAL jq
#      filter, so a file-global grep would still pass if only the guard's
#      filter were dropped. Since buildx v0.36 a single-arch --push also
#      exports attestation manifests, and the human `imagetools inspect`
#      output prints them as `Platform: unknown/unknown`; and a widened
#      decision predicate (e.g. also matching amd64) would make the guard skip
#      every release push, after which deploy-docker would retag an amd64-only
#      list as if multi-arch — the exact silent failure the guard prevents.
#   4. The post-assembly acceptance check must compare the observed real
#      image platforms (from the RAW manifest, same mechanism as the guard)
#      against EXACTLY the two release architectures. A "both present" check
#      would pass a manifest list with a surplus third platform (attestation
#      leftovers, a --set typo), and deploy-docker would retag the surplus
#      verbatim. The comparison operator itself is pinned (the
#      `[ "$arch_list" = "$expected_arch_list" ]` line): without it, a
#      "contains both" rewrite leaves every other anchor intact and green.
#      The fail message sits on its own line below the comparison, so it
#      anchors independently of the operator line.
#   5. The shared buildkitd bootstrap (scripts/docker-bootstrap.sh) pins
#      buildkitd to a FULLY versioned release tag (moby/buildkit:vN.M.K —
#      not `:latest`, `:main`, a digest-only ref, or a partial tag like
#      `v0.35`, each of which satisfies a looser version-shape regex while
#      leaving the engine unpinned), and not the floating `buildx-stable-1`
#      alias — the alias re-points on every buildx stable release, which
#      would upgrade the runner-host buildkitd between two release pushes and
#      can change the layer-cache/attestation behavior mid-flight (see the
#      pinning comment in that script).
#   6. The post-assembly `imagetools create` in build-images-arm64 must stay
#      builder-less. imagetools is a registry-side operation: it talks to the
#      registry directly and never touches a buildkitd, so the step works
#      without `--builder` today — but nothing else pins that. A "consistency"
#      edit that adds `--builder ci` would silently re-point the operation at
#      the builder's context and break the assembly on runners whose default
#      builder points elsewhere. (This check pins "no builder flag on that
#      command"; the alternative — adding `--builder ci` — would need a real
#      release-ref run to verify and is deliberately not taken.)
#   7. The arm64 bake command must keep its shape: `docker buildx bake
#      -f docker-bake.hcl --builder ci` with the `app` target selected
#      positionally (bake has no `--filter` flag — a `--filter app` form
#      aborts with "unknown flag" on every release push), `--push` present
#      (a build that never pushes produces no `-arm64` image for the
#      assembly), and `--set app.platforms=linux/arm64` present (the only
#      reason this job exists). The arm64 bake only executes on release
#      refs, so a shape regression would otherwise surface only as a red
#      release-ref run days later, with deploy-docker retags skipped.
#   8. The arm64 job's release-ref early exit must stay the FIRST branch of
#      its build run block, ahead of anything that touches the registry (the
#      guard's imagetools inspect) or the runner host (the binfmt install): a
#      refactor that moves it below those steps — or replaces the bare
#      `exit 0` — would leave release refs green while every branch push
#      starts running QEMU registration and a registry fetch that must not
#      happen. The run block is the last `- name: Build arm64 image...` step
#      of the job; the ordering is pinned by line position within it.
#   9. The ci-invariants wiring itself must stay wired, not advisory. Every
#      invariant above pins a CODE shape, but the enforcement wiring had
#      three unpinned edges, each mutation-verified: (a) removing
#      `ci-invariants` from `merge-gate`'s `needs` leaves all checks green —
#      the job stops blocking merges while every check passes (the inverse of
#      invariant 2, which only pins that the arm64 job stays OUT of the gate);
#      (b) replacing the `Check CI invariants` step's run line with a no-op
#      leaves all checks green — the script asserts nothing about how it is
#      invoked; (c) dropping the image-drift half of the bootstrap's recreate
#      condition (the `current_image != BUILDKIT_IMAGE` comparison) leaves all
#      checks green, so a "simplify" edit that pins the tag but never
#      re-creates a stale builder passes CI while the pin takes effect only on
#      runners that happen to have no buildkitd. Together these mean a
#      refactor that keeps this script's text but unwires it (or neuters the
#      recreate) reverts the multi-arch guarantee to review-only enforcement.
#   10. The post-assembly acceptance check's RAW-manifest read must keep its
#      failure-hardening posture: the read is guarded (stderr silenced,
#      pipeline `|| true`) so a jq/registry failure surfaces as an EMPTY
#      architecture set, and the explicit `[ -n "$arch_list" ]` guard below
#      the read fails with its own "could not read the raw manifest" message.
#      Without the guard a read failure would die on the equality comparison
#      with the misleading "does not have exactly ... observed platforms:
#      none" message — which reads as "the assembled tag is wrong" when
#      nothing was ever observed. The skip guard's own read is already
#      window-scoped by invariant 3; the acceptance side had no window pin of
#      its own, so this anchors on the arch_list read line itself,
#      independently of invariant 4's comparison anchors.
#
# Usage (from a workflow step, repo root): sh scripts/check-ci-invariants.sh
# Exits non-zero (failing the calling step / job) on any missing invariant.
#
# POSIX sh only (the ci-invariants job runs in node:24-alpine, which has no
# bash): no pipefail, no arrays.

set -eu

WORKFLOW=".forgejo/workflows/build.yaml"
BOOTSTRAP="scripts/docker-bootstrap.sh"

fail() {
  echo "CI-invariant check FAILED: $*" >&2
  exit 1
}

[ -f "$WORKFLOW" ] || fail "$WORKFLOW not found (run from the repo root)"
[ -f "$BOOTSTRAP" ] || fail "$BOOTSTRAP not found (run from the repo root)"

# 1. deploy-docker must depend on build-images-arm64.
deploy_needs=$(grep -n '^  deploy-docker:' -A 15 "$WORKFLOW" | grep -m1 'needs:' || true)
[ -n "$deploy_needs" ] || fail "could not find a needs: line in the deploy-docker job"
echo "$deploy_needs" | grep -q 'build-images-arm64' \
  || fail "deploy-docker no longer depends on build-images-arm64 (the retags would copy a single-arch tag)"
echo "OK: deploy-docker depends on build-images-arm64"

# 2. merge-gate must NOT depend on build-images-arm64 (see invariant 2 above:
# adding it would cascade a skip into branch pushes; a release-ref failure is
# already covered through deploy-docker).
gate_needs=$(grep -n '^  merge-gate:' -A 15 "$WORKFLOW" | grep -m1 'needs:' || true)
[ -n "$gate_needs" ] || fail "could not find a needs: line in the merge-gate job"
echo "$gate_needs" | grep -q 'build-images-arm64' \
  && fail "merge-gate now depends on build-images-arm64 — that cascades a skip into branch pushes; keep the arm64 job out of the gate (it exits 0 on non-release refs and release-ref failures red deploy-docker instead)"
echo "OK: merge-gate does not depend on build-images-arm64"

# 3. The skip guard must read the RAW manifest (guard_archs via
# imagetools inspect --raw — the anchor pins the mechanism) and decide the
# skip ONLY on a real arm64 image: `grep -q '^arm64$'` on guard_archs, window-
# scoped to the decision line. Not file-global: the acceptance check
# (invariant 4) carries an identical jq filter, so a filter-only mutation on
# the guard would still pass a file-global grep — and a widened decision
# predicate (e.g. also matching amd64) would skip every release push.
guard_line=$(grep -n 'guard_archs="\$(docker buildx imagetools inspect --raw' "$WORKFLOW" | head -1 || true)
[ -n "$guard_line" ] \
  || fail "arm64 skip guard no longer reads the raw manifest (guard_archs via imagetools inspect --raw)"
# The real-image filter must live on the guard_archs line itself: a file-global
# grep would still pass if only the guard's filter were dropped, because the
# acceptance check (invariant 4) carries an identical filter.
echo "${guard_line#*:}" | grep -q 'select((.platform?.os // "unknown") != "unknown")' \
  || fail "arm64 skip guard no longer drops os:\"unknown\" attestation entries on its own line (they would false-positive the guard; the acceptance check's identical filter must not mask a dropped guard filter)"
guard_n=${guard_line%%:*}
# The decision must consume guard_archs directly: the window is exactly the
# next line (the if/grep), so a re-route of the decision input or a widened
# predicate is caught even though the jq filter text exists verbatim on the
# acceptance check's line.
guard_window=$(sed -n "$((guard_n + 1))p" "$WORKFLOW")
echo "$guard_window" | grep -q 'if echo "\$guard_archs" | grep -q '"'"'^arm64$'"'"'' \
  || fail "arm64 skip guard no longer decides 'skip' by grep -q '^arm64\$' on guard_archs (the decision must skip ONLY when a real arm64 image is present)"
echo "OK: arm64 skip guard reads the raw manifest and skips only on a real arm64 image"

# 4. The acceptance check must compare the observed real-image platform set
# against EXACTLY the two release architectures (an equality comparison), not
# a "both present" grep — the latter passes a manifest list carrying a
# surplus third platform. Anchor on the two-element expected set, the
# fail-on-deviation message, the equality-comparison line itself (without it,
# a "contains both" rewrite leaves every other anchor intact), and the fail
# branch's shape: its own line below the comparison, so the message anchors
# independently of the operator line.
grep -q 'arch_list="\$(docker buildx imagetools inspect --raw' "$WORKFLOW" \
  || fail "arm64 acceptance check no longer reads the observed platform set from the raw manifest (arch_list via imagetools inspect --raw)"
grep -q '"amd64" "arm64"' "$WORKFLOW" \
  || fail "arm64 acceptance check no longer compares against the exact two-arch set (amd64 + arm64)"
grep -q 'does not have exactly linux/amd64 + linux/arm64' "$WORKFLOW" \
  || fail "arm64 acceptance check no longer fails when the observed platform set deviates from exactly linux/amd64 + linux/arm64"
eq_line=$(grep -n '\[ "\$arch_list" = "\$expected_arch_list" \] ||' "$WORKFLOW" | head -1 || true)
[ -n "$eq_line" ] \
  || fail "arm64 acceptance check no longer uses the exact-equality comparison ([ arch_list = expected_arch_list ] ||) — a 'contains both' rewrite would leave the other anchors intact and pass"
eq_n=${eq_line%%:*}
sed -n "$((eq_n + 1))p" "$WORKFLOW" \
  | grep -q '^[[:space:]]*{ echo "Assembled tag .*does not have exactly linux/amd64 + linux/arm64' \
  || fail "arm64 acceptance check fail branch no longer sits on its own line below the comparison (the [ ... ] || \\ / { echo ... } continuation) — the message must anchor independently of the operator line"
echo "OK: arm64 acceptance check asserts exactly the two release platforms"

# 5. The shared bootstrap must pin buildkitd to a FULLY versioned release
# tag (see invariant 5 above): :latest, :main, a digest-only ref, or a
# partial tag like v0.35 would satisfy a looser `v[0-9]` shape while leaving
# the engine unpinned. The buildkitd `docker run` must not reference the
# floating image alias either (it re-points on every buildx stable release).
grep -q 'BUILDKIT_IMAGE="moby/buildkit:v[0-9][0-9]*\.[0-9][0-9]*\.[0-9][0-9]*"' "$BOOTSTRAP" \
  || fail "docker-bootstrap.sh no longer pins buildkitd to a fully versioned moby/buildkit:vN.M.K release tag (:latest, :main, digest-only, or partial tags are not release pins)"
[ "$(grep -c 'moby/buildkit:buildx-stable-1' "$BOOTSTRAP")" -eq 0 ] \
  || fail "docker-bootstrap.sh references the floating moby/buildkit:buildx-stable-1 image again (it re-points on every buildx stable release)"
echo "OK: docker-bootstrap.sh pins buildkitd to a released tag"

# 6. The post-assembly imagetools create must stay builder-less (see
# invariant 6 above). The check window runs from 5 lines above the anchor
# line (the first `app_tag` line within 5 lines after the `imagetools create`
# line — the `--tag "${app_tag}" \` line, stored in `arm64_create`) down to
# the command's LAST line: the first non-empty, non-comment line from the
# anchor on that does not end in a continuation backslash (today the
# `"${app_tag}" "${arm64_tag}"` append at anchor +1). The pre-fix window was
# a FIXED `anchor + 4` while its comment called it "the whole 5-line command
# window" (it was 10 lines wide): a long enough continuation sequence would
# have pushed the command tail past the fixed end, and a `--builder ci`
# appended there would have passed the pin while the builder-less assembly
# silently eroded. Anchoring the end on the command's own last line keeps
# the pin honest for any number of continuation lines. The arm64 job is the
# only job whose assembly is tagged on the app_tag variable
# (deploy-docker's retags tag on the set-variables outputs).
arm64_create=$(awk '/imagetools create/{c=NR} c && NR>=c && NR<=c+5 && /app_tag/{print NR; c=0}' "$WORKFLOW" | head -1 || true)
[ -n "$arm64_create" ] \
  || fail "arm64 assembly imagetools create (tagged on app_tag) not found in build.yaml"
start=$((arm64_create - 5)); [ "$start" -lt 1 ] && start=1
# The command's last line is the first non-empty, non-comment line from the
# `imagetools create` line on that does NOT end in a continuation backslash
# (today: the `"${app_tag}" "${arm64_tag}"` append at anchor +1, i.e. the line
# right below the `--tag "${app_tag}"` anchor that arm64_create resolves to).
command_end=$(sed -n "${arm64_create},\$p" "$WORKFLOW" | awk '/^[[:space:]]*#/ || NF == 0{next} {end=NR; if ($0 !~ /\\[[:space:]]*$/) exit} END{print end}' || true)
[ -n "$command_end" ] \
  || fail "arm64 assembly imagetools create: could not find the end of the command (no non-comment, non-empty line after it)"
sed -n "${start},$((arm64_create + command_end))p" "$WORKFLOW" | grep -v '^[[:space:]]*#' | grep -q -- '--builder' \
  && fail "the arm64 assembly imagetools create gained a --builder flag — imagetools is registry-side and never touches a buildkitd; it must stay builder-less"
echo "OK: arm64 assembly imagetools create stays builder-less"

# 7. The arm64 bake must keep the shape that only works on release refs
# (see invariant 7 above). Anchor on the arm64-only `--set "app.tags=..."`
# line (build-images never re-tags the app target), then check the whole
# 10-line command window (the bake starts at most 5 lines above the
# anchor): a line-number prefix would not match the bare command text, so
# the window must be extracted as text, not grepped by prefix.
arm64_set=$(grep -n -F -- '--set "app.tags=' "$WORKFLOW" | head -1 || true)
[ -n "$arm64_set" ] \
  || fail "arm64 bake --set \"app.tags=...\" not found in build.yaml (is the app target still built positionally with an explicit tag?)"
set_line=${arm64_set%%:*}
start=$((set_line - 5)); [ "$start" -lt 1 ] && start=1
# Strip comment lines before checking: the job's comment documents that
# bake has no --filter flag, so a raw grep would match the comment.
bake_window=$(sed -n "${start},$((set_line + 5))p" "$WORKFLOW" | grep -v '^[[:space:]]*#')
echo "$bake_window" | grep -q -- '--set app.platforms=linux/arm64' \
  || fail "arm64 bake no longer sets app.platforms=linux/arm64 (the only reason the arm64 job exists)"
# The target name is selected positionally: app must lead its own argument
# line — a `--filter app` regression (unknown flag, aborts every release
# push) would bury it behind the flag instead.
echo "$bake_window" | grep -q '^[[:space:]]*app ' \
  || fail "arm64 bake no longer selects the app target positionally (bake has no --filter flag; the target must be a bare leading argument)"
echo "$bake_window" | grep -q -- '--filter' \
  && fail "arm64 bake reintroduced a --filter flag — docker buildx bake has no such flag (the target is selected positionally)"
echo "$bake_window" | grep -q -- '--push' \
  || fail "arm64 bake dropped --push (an unpushed build produces no -arm64 image for the assembly)"
echo "OK: arm64 bake command keeps its positional-app/--push/linux/arm64 shape"

# 8. The release-ref early exit must stay the FIRST branch of the build run
# block, ahead of the registry-touching guard and the runner-host-touching
# binfmt install (see invariant 8 above). The build step is the LAST
# `- name: Build arm64 image...` step in the file (it is the arm64 job's), so
# its run block is the lines from that name to the next 6-space-indented step
# name below it (test-unit's first step today) — the only guarantee that
# bound carries is that no step below it contains a binfmt/guard line today.
build_name=$(grep -n -- '- name: Build arm64 image and assemble the multi-arch tag' "$WORKFLOW" | tail -1 || true)
[ -n "$build_name" ] \
  || fail "arm64 build step ('Build arm64 image and assemble the multi-arch tag') not found in build.yaml"
build_n=${build_name%%:*}
# First 6-space-indented step name strictly after the build step marks the end
# of its run block (grep -n gives line numbers; awk picks the first > build_n).
next_step=$(grep -n '^      - name: ' "$WORKFLOW" | awk -v start="$build_n" -F: '$1 > start{print $1; exit}')
[ -n "$next_step" ] \
  || fail "could not find the step that follows the arm64 build step (build-step run block unbounded)"
block_end=${next_step%%:*}
# The guard's `guard_archs=` variable name is what makes its inspect line the
# unique registry touch in this block (the acceptance check's own arch_list
# read is a SECOND registry touch, also 2>/dev/null'd, so 2>/dev/null alone
# does not disambiguate; the guard_archs= name does — the same anchor
# invariant 3 matches); the binfmt run is the unique runner-host touch. Pin
# the ordering, not the exact spacing: the bare `exit 0` on its own line is
# part of the shape too.
early_exit=$(awk -v start="$build_n" -v end="$block_end" 'NR >= start && NR < end && /set-variables.outputs.is_release_branch/ && /!= "true"/{print NR; exit}' "$WORKFLOW")
[ -n "$early_exit" ] \
  || fail "arm64 release-ref early exit (is_release_branch != \"true\" guard) not found in the build run block"
guard_archs_n=$(awk -v start="$build_n" -v end="$block_end" 'NR >= start && NR < end && /guard_archs="\$\(docker buildx imagetools inspect/{print NR; exit}' "$WORKFLOW")
binfmt_n=$(awk -v start="$build_n" -v end="$block_end" 'NR >= start && NR < end && /tonistiigi\/binfmt/{print NR; exit}' "$WORKFLOW")
[ -n "$guard_archs_n" ] \
  || fail "arm64 skip guard (guard_archs imagetools inspect) not found in the build run block"
[ -n "$binfmt_n" ] \
  || fail "arm64 binfmt install (tonistiigi/binfmt) not found in the build run block"
awk -v e="$early_exit" -v g="$guard_archs_n" 'BEGIN{exit !(e < g)}' \
  || fail "arm64 release-ref early exit no longer precedes the registry-touching guard — branch pushes would run QEMU registration and a registry fetch"
awk -v e="$early_exit" -v b="$binfmt_n" 'BEGIN{exit !(e < b)}' \
  || fail "arm64 release-ref early exit no longer precedes the runner-host-touching binfmt install — branch pushes would register QEMU handlers for nothing"
sed -n "$((early_exit + 1)),$((early_exit + 2))p" "$WORKFLOW" | grep -q '^[[:space:]]*exit 0[[:space:]]*$' \
  || fail "arm64 early exit no longer ends with a bare exit 0 (a non-zero exit or a different construct would change branch-push behavior)"
echo "OK: arm64 release-ref early exit stays first in the build run block, before the guard and the binfmt install"

# 9. The ci-invariants wiring itself must stay wired, not advisory (see
# invariant 9 above). The three edges are each anchored the same way the
# other invariants are, and each is mutation-testable with the same
# scratch-copy method.
# (a) merge-gate must KEEP depending on ci-invariants: the gate is what makes
# the check blocking — a merge-gate `needs` line without it lets the job fail
# (or be deleted) while merges proceed and every check passes.
gate_needs_9=$(grep -n '^  merge-gate:' -A 15 "$WORKFLOW" | grep -m1 'needs:' || true)
[ -n "$gate_needs_9" ] || fail "could not find a needs: line in the merge-gate job"
echo "$gate_needs_9" | grep -q 'ci-invariants' \
  || fail "merge-gate no longer depends on ci-invariants — the invariants check would stop blocking merges (keep it in the gate; the arm64 job stays out, but this job stays in)"
echo "OK: merge-gate depends on ci-invariants (the check stays blocking)"
# (b) The `Check CI invariants` step must still invoke this script: a no-op
# run line keeps the job green and the file text while making the check
# advisory. Window: the step name to the next 6-space-indented step name
# (the ci-invariants job's checkout step precedes it; the next step below, if
# any, bounds the window).
step_name=$(grep -n -- '- name: Check CI invariants' "$WORKFLOW" | head -1 || true)
[ -n "$step_name" ] \
  || fail "the 'Check CI invariants' step of the ci-invariants job was renamed or removed"
step_n=${step_name%%:*}
next_after_step=$(grep -n '^      - name: ' "$WORKFLOW" | awk -v start="$step_n" -F: '$1 > start{print $1; exit}' || true)
if [ -n "$next_after_step" ]; then
  run_window=$(sed -n "$((step_n + 1)),$((next_after_step - 1))p" "$WORKFLOW")
else
  run_window=$(sed -n "$((step_n + 1)),\$p" "$WORKFLOW")
fi
echo "$run_window" | grep -q 'run: sh scripts/check-ci-invariants.sh' \
  || fail "the 'Check CI invariants' step no longer runs: sh scripts/check-ci-invariants.sh — the job is advisory now"
echo "OK: the Check CI invariants step still invokes the script"
# (c) The bootstrap's recreate condition must keep its image-drift half:
# without `current_image != BUILDKIT_IMAGE`, a runner whose buildkitd already
# exists with an older image is never recreated and the pin takes effect only
# on runners that happen to have no buildkitd.
grep -q '\[ "\$current_image" != "\${BUILDKIT_IMAGE}" \]' "$BOOTSTRAP" \
  || fail "docker-bootstrap.sh dropped the image-drift recreate condition (current_image != BUILDKIT_IMAGE) — a stale buildkitd would never be re-created with the pinned image"
echo "OK: docker-bootstrap.sh recreates the builder on image drift"

# 10. The acceptance check's RAW-manifest read must keep its failure-
# hardening posture (see invariant 10 above). Anchor on the arch_list read
# line: the variable name disambiguates it from the guard's read (guard_archs)
# without window scoping. The read line itself must silence stderr and guard
# the pipeline with `|| true` (a jq/registry failure must surface as the
# EMPTY SET), and the non-empty guard with its own "could not read the raw
# manifest" message must sit immediately below the read, ahead of the
# comparison. Mutation-tested: unguarding the pipeline (dropping `|| true`),
# or deleting the non-empty guard, each fail a distinct anchor.
accept_read_line=$(grep -n 'arch_list="\$(docker buildx imagetools inspect --raw' "$WORKFLOW" | head -1 || true)
[ -n "$accept_read_line" ] \
  || fail "arm64 acceptance check no longer reads the observed platform set from the raw manifest (arch_list via imagetools inspect --raw)"
echo "${accept_read_line#*:}" | grep -q '2>/dev/null' \
  || fail "arm64 acceptance raw-manifest read no longer silences stderr (a read failure would print a raw jq/registry error instead of the distinct could-not-read message)"
echo "${accept_read_line#*:}" | grep -q '| sort -u || true' \
  || fail "arm64 acceptance raw-manifest read no longer guards the pipeline with || true (a read failure must surface as the empty set, not a dying subshell)"
accept_read_n=${accept_read_line%%:*}
sed -n "$((accept_read_n + 1)),$((accept_read_n + 3))p" "$WORKFLOW" \
  | grep -q '\[ -n "\$arch_list" \] ||' \
  || fail "arm64 acceptance check lost its non-empty guard below the raw-manifest read (a jq/registry failure would die on the comparison as 'observed platforms: none' instead of the distinct could-not-read message)"
sed -n "$((accept_read_n + 1)),$((accept_read_n + 4))p" "$WORKFLOW" \
  | grep -q 'could not read the raw manifest' \
  || fail "arm64 acceptance check's read-failure message is gone (the empty-set guard must fail with its own could-not-read message, distinct from the platform-set deviation)"
echo "OK: arm64 acceptance raw-manifest read keeps its failure-hardening posture"

echo "ci-invariants: all checks passed"
