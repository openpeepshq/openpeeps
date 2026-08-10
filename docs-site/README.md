# OpenPeeps documentation site (docs.openpeeps.org)

Static multi-version docs built from [`platform/web/docs/`](../platform/web/docs/)
as a **React** SPA themed with [`@openpeepshq/react-ui`](../libraries/react-ui/)
(`OpenpeepsLight`), served by nginx.

## Versions

| Entry | Source |
|-------|--------|
| `main` | `main` branch HEAD |
| `staging` | `staging` branch HEAD |
| `{date}-{sha}-RELEASE (stable)` | Newest `*-RELEASE` git tag |
| older `*-RELEASE` tags | Up to four additional recent release tags |

There is **no** separate `stable` entry — it is collapsed into the newest
`*-RELEASE (stable)` label. Default landing URL is the newest release.

## Local development

```bash
pnpm install
pnpm --filter @openpeepshq/react-ui build
pnpm --filter @openpeepshq/docs-site run build:local   # worktree → dist/main/
pnpm --filter @openpeepshq/docs-site run dev           # Vite dev server :5175
```

Full multi-version (needs remotes + tags):

```bash
pnpm --filter @openpeepshq/docs-site run build
```

Docker image (after build):

```bash
docker build -t openpeeps-docs:local -f docs-site/Dockerfile docs-site
docker run --rm -p 8080:80 openpeeps-docs:local
```

## CI

[`.forgejo/workflows/docs.yaml`](../.forgejo/workflows/docs.yaml) builds and
pushes `code.openpeeps.org/openpeeps/openpeeps-docs:{sha,latest}` on pushes to
`main` / `staging` / `stable`.

## Deploy

Compose lives in the **code** repo under
[`devops/services/openpeeps-docs/`](https://gitlab.allpeep-hq.com/allpeep/code/-/tree/main/devops/services/openpeeps-docs).

```bash
# on microservices.allpeep.cloud
docker login code.openpeeps.org
# copy devops/services/openpeeps-docs → /services/openpeeps-docs
cd /services/openpeeps-docs && cp .env.example .env
docker compose pull && docker compose up -d
```

DNS: `docs.openpeeps.org` → `microservices.allpeep.cloud`.

## Content

Edit markdown under `platform/web/docs/`. Absolute `/docs/...` links are rewritten
to site-root paths during the build. In-app SPA `/docs` is unchanged.

### Raw markdown (for LLMs)

Each HTML page also has a `.md` URL that returns the source file as
`text/markdown`:

| Page | Raw markdown |
|------|----------------|
| `/{version}/` | `/{version}/index.md` |
| `/{version}/user` | `/{version}/user.md` |
| `/{version}/user/markdown` | `/{version}/user/markdown.md` |

Each page includes a “View as Markdown” link to the matching file.
