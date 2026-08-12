---
name: run-openpeeps
description: >-
  Run the OpenPeeps platform locally (Express API, BullMQ worker, React SPA).
  Use when setting up a dev environment, starting the application, or debugging
  local API, UI, or background-job behavior.
---

# Run OpenPeeps Locally

**Type:** Rigid. Follow startup order exactly — the SPA depends on the API, and background jobs depend on Redis plus the worker process.

## When to Use

- First-time local setup
- Starting or restarting the dev stack
- Debugging API, UI, or background-job behavior

## Runtime

| Package | Path | Role |
|---------|------|------|
| `@openpeepshq/server` | `platform/server` | Express + Riddl API on port **5173** |
| Worker (same package) | `platform/server` | BullMQ jobs — separate process |
| `@openpeepshq/web` | `platform/web` | Vite + React SPA on port **5174** (proxies `/api` → 5173) |
| `@openpeepshq/react` | `platform/react` | Shared components (built dependency of web) |

## Prerequisites

1. Node.js 24.x (Node 20.19+ works for development)
2. `pnpm@11.1.3` — `npm i -g pnpm@11.1.3`
3. `ffmpeg` — required for media processing
4. Docker — for Postgres, Redis, and Mailpit in local dev

## Setup (from repo root)

```bash
# 1. Environment
cp .env.dev.example .env

# 2. Database, Redis, and Mailpit
docker compose up -d postgres redis mailpit
# or later: included in `pnpm dev`

# 3. Dependencies (filtered install is faster; full install also works)
pnpm \
  --filter "@openpeepshq/server..." \
  --filter "@openpeepshq/web..." \
  install

# 4. One-time build of the server + web closure
pnpm -r \
  --filter "@openpeepshq/server..." \
  --filter "@openpeepshq/web..." \
  build
```

`@openpeepshq/server` reads `.env` via dotenv. `@openpeepshq/web` only needs `VITE_API_PROXY_TARGET` if the API is not on `http://localhost:5173`.

## Start

From the repo root (after setup above):

```bash
pnpm dev
```

This runs `docker compose up -d postgres redis mailpit`, then API, worker, and
web via `concurrently` (log prefixes `api` / `worker` / `web`). Ctrl+C stops the
three app processes; leave containers up, or `docker compose down` to stop them.

Equivalent separate terminals:

```bash
pnpm run dev:infra
cd platform/server && pnpm dev
cd platform/server && pnpm dev:worker
cd platform/web && pnpm dev
```

Wait until Vite prints `Local: http://localhost:5174/` before opening the browser. The first web start can take a minute while greenscreen builds.

| URL | Purpose |
|-----|---------|
| http://localhost:5174 | Primary UI (proxies API) |
| http://localhost:5173 | API (`/api/openpeeps/core/v1/...`) |
| http://localhost:8025 | Mailpit UI (caught email) |
| localhost:5432 | Postgres (`openpeeps` / `openpeeps`) |
| localhost:6379 | Redis |
| localhost:1025 | Mailpit SMTP |

The worker is optional for loading pages but required for push/email delivery, media transcoding, and other background jobs.

## After Code Changes

Rebuild the package you edited so consumers pick up workspace `dist/` output:

```bash
pnpm --filter @openpeepshq/<pkg> build
```

Typical dependency order: `common` → `core` → `react` → `server` / `web`.

- `@openpeepshq/react` must be rebuilt after edits — web consumes its built output.
- `@openpeepshq/web` has `build:watch` for iterative UI work.

## Verify It Works

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  http://localhost:5173/api/openpeeps/core/v1/server/info
```

Expect `200`, then open http://localhost:5174 in a browser.

For the UI, also confirm Vite is serving HTML:

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:5174/
```

Expect `200`. A blank page or hung load usually means Vite failed during startup — check the web terminal for errors.

## Integration Tests

```bash
pnpm --filter @openpeepshq/tests exec playwright install   # one-time
pnpm --filter @openpeepshq/tests test:integration
```

`pretest:integration` builds server + web automatically.

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Opening port 5173 in the browser | Use **5174** — that's the SPA |
| Running only the API, not the web dev server | Start server and web (plus worker when testing background jobs) |
| Editing `@openpeepshq/react` without rebuilding | `pnpm --filter @openpeepshq/react build` |
| Expecting `docker compose up` to start the app | Compose only provides Postgres/Redis/Mailpit; use `pnpm dev` for the full stack |
| Port 5174 open but blank / Vite import errors on `@openpeepshq/common` | Rebuild libraries: `pnpm --filter @openpeepshq/common build` (or re-run the full step-4 build), then restart `pnpm dev` in `platform/web` |
| Skipping the initial build step | Step 4 is required — `@openpeepshq/web` imports from built `dist/` outputs in workspace packages like `@openpeepshq/common` |

## Production Note

Local dev runs processes natively. The root `Dockerfile` builds a production image where `docker/prod/start.sh web` runs the API with the baked-in SPA and `start.sh worker` runs BullMQ workers.
