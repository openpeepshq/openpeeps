# @openpeeps/server

A standalone Node/Express server that exposes the full OpenPeeps Community
Server API via [`@riddl/core`](https://www.npmjs.com/package/@riddl/core).
logic is reused unchanged — every handler delegates to the same
`@openpeeps/core` services (PostgreSQL models, JWT helpers, S3/media, Stripe,
LiveKit jams, push notifications, …).

## Quick start

```bash
# from the openpeeps workspace root
pnpm install

# start in dev mode (vite-node, hot reload)
cd platform/server
pnpm dev

# production build + run
pnpm build
pnpm start          # runs dist/server.js under vite-node
```

The server listens on `PORT` (default `5173`). All routes are mounted under
`/api/openpeeps/core/v1/...` so existing `@openpeeps/client` consumers can
point at this server with no URL changes.

> **Why `vite-node` in production?** `pnpm build` already produces a thin
> `dist/server.js` entry that defers everything to workspace packages at
> runtime. We use `vite-node` (not bare `node`) as the runtime loader because
> several of those workspace packages ship `dist/` outputs that omit `.js`
> extensions on relative imports (e.g. `@openpeeps/common/dist/lib/index.js`
> does `export * from './capabilitiesHelpers'`). That's invalid under strict
> Node ESM but resolves cleanly under `vite-node`'s loader. Once the upstream
> packages are rebuilt with correct ESM specifiers, swap `pnpm start` for
> `pnpm start:node` — no other changes required.

A machine-readable OpenAPI 3.0 document is served at `/openapi.json` — ~4 MB
covering all 155 endpoints.

## Layout

```
platform/server/
├── src/
│   ├── server.ts              # express entry, wires Riddl + middleware
│   ├── types.ts               # augments Riddl.RequestContext (auth, profile, account)
│   ├── api/                   # auto-loaded by `import.meta.glob('./api/**/*.ts')`
│   │   ├── middleware.ts      # authorization (Bearer JWT → event.context.*)
│   │   ├── openpeeps/core/v1/ # 155 endpoint files (GET.ts, POST.ts, PUT.ts, DELETE.ts, PATCH.ts)
│   │   ├── pwa/manifest.json/ # served at /api/pwa/manifest.json
│   │   └── …
│   └── lib/
│       ├── endpoint.ts        # Riddl endpoint helper (legacy input merge shim)
│       ├── errors.ts          # forbidden(), notFound(), conflict(), etc.
│       ├── helpers.ts         # Response-based variants of the same
│       ├── auth.ts            # ensureLocalProfile, ensureProfileOrPublicCommunity, …
│       ├── middleware/        # authorization middleware
│       ├── handlers/          # framework-agnostic request handlers
│       ├── sse.ts             # produceStream() helper for SSE endpoints
│       └── init.ts            # initializeServer() — roles, plugins, notifications
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## How endpoints work

Handlers use the `endpoint()` helper from `src/lib/endpoint.ts`, which wraps
`@riddl/core` and merges body, query, and path params into a single `input`
object for convenience:

```ts
import { endpoint, z } from '#lib/endpoint';

export const Input = loginRequestSchema;
export const Output = tokenResponseSchema;

export const apiEndpoint = endpoint({ Input, Output }).handle(
  async (input, event) => {
    // `input` is merged body+query+param;
    // `event.context.currentProfile` is populated by middleware.ts.
  },
);
```

Riddl auto-discovers each `apiEndpoint` export via the glob in `server.ts`.

`src/api/middleware.ts` is picked up by Riddl's middleware loader and wraps
every request below `./api/...`. It reads the `Authorization: Bearer <jwt>`
header and populates `event.context.{authorization, currentProfile,
currentAccount}` so `auth.ts` helpers (e.g. `ensureLocalProfile`) work as expected.

## Sanity check

```bash
pnpm dev &
sleep 12

# public endpoint
curl -s -w "%{http_code}\n" http://localhost:5173/api/openpeeps/core/v1/server/info

# protected endpoint without auth → 401
curl -s -w "%{http_code}\n" http://localhost:5173/api/openpeeps/core/v1/posts

# protected endpoint with auth
curl -s -H "authorization: Bearer $JWT" \
  http://localhost:5173/api/openpeeps/core/v1/profiles/current
```

## Known limitations

- **Sentry integration was dropped.** A Node-side equivalent can be re-added in
  `src/lib/init.ts` via `@sentry/node` whenever it's wanted.
- **`.well-known/apple-app-site-association`, `.test/`** and the manifest are
  exposed under `/api/` rather than at the root path. If you need the
  original root paths (e.g. for iOS deep-linking), add a few `app.get(...)`
  routes in `src/server.ts` that delegate to the Riddl handler manually or
  set up a reverse-proxy alias.
- **Production currently requires `vite-node`** (see Quick start). This is a
  workaround for missing `.js` extensions in `@openpeeps/common`'s and
  `@openpeeps/core`'s compiled `dist/` outputs — not an issue with this
  server. `pnpm start:node` is provided for the day those packages are fixed.
