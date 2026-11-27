# Forgejo Actions CI

This directory contains the Forgejo Actions workflow equivalent of the GitLab CI pipeline (`.gitlab-ci.yml`). The workflow runs on push to any branch and on `workflow_dispatch`.

## Setup

1. **Enable Actions** in the repository (Settings → Units → enable Actions).

2. **Configure a runner** with label `docker` (e.g. [Forgejo Runner](https://forgejo.org/docs/latest/admin/actions/runner-installation/)).

3. **Add repository secrets** (Settings → Secrets and Variables → Actions):

   | Secret              | Description                                                                                  |
   | ------------------- | -------------------------------------------------------------------------------------------- |
   | `REGISTRY`          | Container/registry host (e.g. `code.example.com`) — no `https://`                            |
   | `REGISTRY_USER`     | Username for registry login (e.g. Forgejo username or robot account)                         |
   | `REGISTRY_PASSWORD` | Password or personal access token (must have `write:packages` and repo push for release tag) |

4. **Default branch**: The workflow uses `main` as the default branch (for “latest” tag and for `publish-packages`). To use another branch, set the `DEFAULT_BRANCH` env in `.forgejo/workflows/ci.yaml`.

## Variable mapping (GitLab → Forgejo)

| GitLab CI variable     | Forgejo equivalent                                                         |
| ---------------------- | -------------------------------------------------------------------------- |
| `CI_COMMIT_BRANCH`     | `forgejo.ref_name`                                                         |
| `CI_DEFAULT_BRANCH`    | `env.DEFAULT_BRANCH` (default `main`)                                      |
| `CI_COMMIT_REF_SLUG`   | Computed in `set-variables` from `ref_name`                                |
| `CI_COMMIT_SHORT_SHA`  | Computed in `set-variables` (first 8 chars of `forgejo.sha`)               |
| `CI_COMMIT_SHA`        | `forgejo.sha`                                                              |
| `CI_REGISTRY`          | `secrets.REGISTRY`                                                         |
| `CI_REGISTRY_IMAGE`    | `secrets.REGISTRY`/`forgejo.repository`                                    |
| `CI_REGISTRY_USER`     | `secrets.REGISTRY_USER`                                                    |
| `CI_REGISTRY_PASSWORD` | `secrets.REGISTRY_PASSWORD`                                                |
| `CI_PROJECT_ID`        | N/A — Forgejo uses `forgejo.repository` (owner/repo) for package API paths |
| `CI_JOB_TOKEN`         | Use `secrets.REGISTRY_PASSWORD` (PAT) or `forgejo.token` where supported   |
| `CI_SERVER_HOST`       | `secrets.REGISTRY`                                                         |

## Behaviour vs GitLab CI

- **Manual deploy**: In GitLab, `deploy-docker` was manual for `staging`/`stable`. In Forgejo you can use [Environments](https://forgejo.org/docs/latest/user/actions/advanced-features/) with required reviewers to get manual approval for those branches.
- **Image and npm**: Registry image is `REGISTRY/owner/repo`; npm registry URL is `https://REGISTRY/api/packages/{owner}/npm/` (owner is taken from `forgejo.repository`).
- **Persistent host-side buildkitd**: The image-build jobs (`build-images`, `build-images-arm64`) do not each start their own builder. They source the shared `scripts/docker-bootstrap.sh` (`docker_ensure_builder ci`), which keeps one **persistent** `buildkitd` container on the runner host (`moby/buildkit` pinned to a fully versioned release tag, never the floating `buildx-stable-1` alias) with a named `buildkit-cache` volume for the layer cache — the cache survives across jobs and across container recreation. The container is created if missing and re-created only when stopped or running a different image than the pin (so a pin bump takes effect on runners that already have one; the volume/cache survives the re-create). The buildx builder record is ephemeral per job container and re-created on each run.
- **`ci-invariants` workflow-shape guard**: A dedicated `ci-invariants` job runs `sh scripts/check-ci-invariants.sh`, which pins the workflow and bootstrap shapes the multi-arch image guarantee depends on (e.g. `deploy-docker` keeps its `needs` on `build-images-arm64`; the arm64 skip guard and acceptance check keep their raw-manifest mechanism; the post-assembly `imagetools create` stays builder-less; the buildkitd pin keeps its fully versioned shape; the check's own enforcement wiring stays wired). It is fanned into `merge-gate`, so a **red `ci-invariants` job means a workflow _shape_ violation, not a code bug** — the failing line names the exact invariant that drifted. A green `ci-invariants` is a precondition of merge. The check is POSIX sh (the job runs in `node:24-alpine`, which has no bash) and is mutation-tested: breaking any pinned shape on a scratch copy makes the matching check fail.
