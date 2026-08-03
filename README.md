# OpenPeeps: The Open Source Community Solution by AllPeeP

The runtime is composed of three core packages:

- `@openpeeps/server` (`platform/server`) — Express + Riddl API and static
  host for the SPA. Listens on `PORT` (default `5173`) and exposes the full
  API under `/api/openpeeps/core/v1/...`. Ships a sibling worker entrypoint
  (`src/worker.ts` → `dist/worker.js`) that runs the BullMQ jobs from
  `@openpeeps/worker` (notifications, media processing, emails, …) and must
  be started as its own process alongside the API.
- `@openpeeps/web` (`platform/web`) — Vite + React SPA shell that consumes the
  API. Dev server runs on port `5174` and proxies `/api` to the server.
- `@openpeeps/react` (`platform/react`) — Shared React components and hooks
  used by `@openpeeps/web` and downstream consumers.

See `platform/README.md` for the full package inventory.

## Prerequisites

1. Node.js 24.x (Node 20.19+ also works for development).
2. `ffmpeg` — on macOS: `brew update && brew install ffmpeg`.
3. `pnpm` 11.1.3 (matches `packageManager` in `package.json`):
   `npm i -g pnpm@11.1.3`.
4. Docker (for the database, Redis, and production-style builds).

## Set up local development

From the repo root:

1. Copy env templates:

   ```bash
   cp .env.dev.example .env
   ```

   `@openpeeps/server` reads `.env` at startup via `dotenv`; `@openpeeps/web`
   uses Vite envs (`VITE_*`) and only needs `VITE_API_PROXY_TARGET` if the
   server is not on `http://localhost:5173`. See `.env.dev.example` for Redis,
   SMTP, media, LiveKit, VAPID, Stripe, Sentry (`SENTRY_DSN`), and CORS
   knobs (leave optional integrations unset until you need them; Sentry
   is off unless `SENTRY_DSN` is set).

   Set a stable `JWT_SECRET` if you run more than one server/worker process or
   care about tokens surviving restarts. Production images fail fast when it is
   missing.

2. Start Postgres and Redis:

   ```bash
   docker compose up -d postgres redis
   ```

   Postgres listens on `localhost:5432` with user/database/password
   `openpeeps`. Set `DATABASE_URL` in `.env` if you use different credentials
   (default:
   `postgresql://openpeeps:openpeeps@localhost:5432/openpeeps`). Drizzle
   migrations run automatically when the server starts.

3. Install workspace dependencies (only what server + web actually need):

   ```bash
   pnpm \
     --filter "@openpeeps/server..." \
     --filter "@openpeeps/web..." \
     install
   ```

   Or `pnpm install` to install the entire workspace.

4. Build the dependency closure once (libraries → react → server → web):

   ```bash
   pnpm -r \
     --filter "@openpeeps/server..." \
     --filter "@openpeeps/web..." \
     build
   ```

5. Run the API, the worker, and the SPA dev server in separate terminals:

   ```bash
   # Terminal 1 — API on http://localhost:5173
   cd platform/server && pnpm dev

   # Terminal 2 — BullMQ worker (notifications, media, emails, …)
   cd platform/server && pnpm dev:worker

   # Terminal 3 — SPA on http://localhost:5174 (proxies /api to :5173)
   cd platform/web && pnpm dev
   ```

   The worker is optional for serving pages but required for anything that
   relies on background jobs (push/email delivery, media transcoding,
   scheduled tasks). It connects to the same Redis instance started in
   step 2.

   Open `http://localhost:5174`.

## Development workflow

- When you change a package under `platform/` or `libraries/`, rebuild it with
  `pnpm --filter <pkg> build` (or run a `build:watch` script where available,
  e.g. `pnpm --filter @openpeeps/web build:watch`). Both `@openpeeps/server`
  and `@openpeeps/web` re-pick up workspace `dist/` outputs through pnpm.
- `@openpeeps/react` ships as a built package; after editing it run
  `pnpm --filter @openpeeps/react build` so the web app sees the changes.

## Tests

Integration tests live in `platform/tests` (Playwright).

```bash
# One-time browser install
pnpm --filter @openpeeps/tests exec playwright install

# Build server + web and run the suite (resets the `test` DB by default)
pnpm --filter @openpeeps/tests test:integration
```

`pretest:integration` builds `@openpeeps/server...` and `@openpeeps/web`
automatically, so you don't need a separate build step.

## Docker / production

`docker-compose.yml` provides `postgres` and `redis` for local dev.
For a production-style build use the workspace `Dockerfile`, which:

1. Installs the dependency closure for `@openpeeps/server`,
   `@openpeeps/worker`, and `@openpeeps/web`.
2. Builds them in topological order with `pnpm -r build`.
3. Runs the resulting Node process via `docker/prod/start.sh`:
   - `start.sh web` → `node platform/server/dist/server.js` (API + serves the
     SPA from the baked-in `WEB_DIST_PATH`).
   - `start.sh worker` → `node platform/server/dist/worker.js` (BullMQ workers
     from `@openpeeps/worker`, plus React email templates).

Production checklist (ops/DX):

- Set `JWT_SECRET` (required; shared across replicas). Mint with
  `node scripts/create-jwt-secret.mjs` or `opc secrets create-jwt-secret`
  (the opc path does not load core config, so it works before the secret exists).
- Set `SERVER_HOST` (and `CORS_ORIGINS` if the SPA is on another origin).
- Enable LiveKit only by setting `JAMS_LIVEKIT_URL` + API key/secret.
- Put edge rate limits (Traefik/CDN) on auth routes and anonymous public GETs.

## Documentation

Visit `/docs/development` on your local install or
<https://openpeeps.ap.social/docs/> for the latest stable version
documentation.

## Database

Admins with database access use **Drizzle Studio**
(`pnpm --filter @openpeeps/core db:studio`) or **`psql`** with `DATABASE_URL`.
See `/admin/db` in the web app.
