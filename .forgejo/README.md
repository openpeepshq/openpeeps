# Forgejo Actions CI

This directory contains the Forgejo Actions workflow equivalent of the GitLab CI pipeline (`.gitlab-ci.yml`). The workflow runs on push to any branch and on `workflow_dispatch`.

## Setup

1. **Enable Actions** in the repository (Settings → Units → enable Actions).

2. **Configure a runner** with label `docker` (e.g. [Forgejo Runner](https://forgejo.org/docs/latest/admin/actions/runner-installation/)).

3. **Add repository secrets** (Settings → Secrets and Variables → Actions):

   | Secret               | Description |
   |----------------------|-------------|
   | `REGISTRY`           | Container/registry host (e.g. `code.example.com`) — no `https://` |
   | `REGISTRY_USER`      | Username for registry login (e.g. Forgejo username or robot account) |
   | `REGISTRY_PASSWORD`  | Password or personal access token (must have `write:packages` and repo push for release tag) |

4. **Default branch**: The workflow uses `main` as the default branch (for “latest” tag and for `publish-packages`). To use another branch, set the `DEFAULT_BRANCH` env in `.forgejo/workflows/ci.yaml`.

## Variable mapping (GitLab → Forgejo)

| GitLab CI variable       | Forgejo equivalent |
|--------------------------|---------------------|
| `CI_COMMIT_BRANCH`       | `forgejo.ref_name`  |
| `CI_DEFAULT_BRANCH`      | `env.DEFAULT_BRANCH` (default `main`) |
| `CI_COMMIT_REF_SLUG`     | Computed in `set-variables` from `ref_name` |
| `CI_COMMIT_SHORT_SHA`    | Computed in `set-variables` (first 8 chars of `forgejo.sha`) |
| `CI_COMMIT_SHA`          | `forgejo.sha`       |
| `CI_REGISTRY`            | `secrets.REGISTRY`  |
| `CI_REGISTRY_IMAGE`      | `secrets.REGISTRY`/`forgejo.repository` |
| `CI_REGISTRY_USER`       | `secrets.REGISTRY_USER` |
| `CI_REGISTRY_PASSWORD`   | `secrets.REGISTRY_PASSWORD` |
| `CI_PROJECT_ID`          | N/A — Forgejo uses `forgejo.repository` (owner/repo) for package API paths |
| `CI_JOB_TOKEN`           | Use `secrets.REGISTRY_PASSWORD` (PAT) or `forgejo.token` where supported |
| `CI_SERVER_HOST`         | `secrets.REGISTRY`  |

## Behaviour vs GitLab CI

- **Manual deploy**: In GitLab, `deploy-docker` was manual for `staging`/`stable`. In Forgejo you can use [Environments](https://forgejo.org/docs/latest/user/actions/advanced-features/) with required reviewers to get manual approval for those branches.
- **Image and npm**: Registry image is `REGISTRY/owner/repo`; npm registry URL is `https://REGISTRY/api/packages/{owner}/npm/` (owner is taken from `forgejo.repository`).
