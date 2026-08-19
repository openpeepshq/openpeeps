# OpenPeeps release notes (releases.openpeeps.org)

Self-contained HTML pages under this directory, served by nginx.

Write a new page with [`prompts/release-description.md`](../prompts/release-description.md)
and add a card on [`index.html`](index.html).

## Local

```bash
docker build -t openpeeps-releases:local -f releases/Dockerfile releases
docker run --rm -p 8080:80 openpeeps-releases:local
```

## CI

[`.forgejo/workflows/releases.yaml`](../.forgejo/workflows/releases.yaml) builds
and pushes `code.openpeeps.org/openpeeps/openpeeps-releases:{sha,latest}` on
pushes to `main` / `staging` / `stable`.

## Deploy

Compose lives in the **code** repo under
[`devops/services/openpeeps-releases/`](https://gitlab.allpeep-hq.com/allpeep/code/-/tree/main/devops/services/openpeeps-releases).

```bash
# on microservices.allpeep.cloud
docker login code.openpeeps.org
# copy devops/services/openpeeps-releases → /services/openpeeps-releases
cd /services/openpeeps-releases && cp .env.example .env
docker compose pull && docker compose up -d
```

DNS: `releases.openpeeps.org` → `microservices.allpeep.cloud`.
