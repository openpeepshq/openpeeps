# AT Protocol conformance harness

Manual / lab checks against a running OpenPeeps instance with
`atproto.active: true`. Not part of ordinary PR CI. Mirrors
[`../activitypub/`](../activitypub/) — a script you run when you mean to
test federation, not a Playwright project.

Design and ID rules:
[`planning/at-protocol/bluesky-compat.md`](../../../planning/at-protocol/bluesky-compat.md).

## What this tests

| Tier | Script              | When                                                                     |
| ---- | ------------------- | ------------------------------------------------------------------------ |
| 0    | `test-identity.mjs` | Now. Official `@atproto/*` against our XRPC.                             |
| 1    | `test-lab.mjs`      | After CAR + firehose probes pass. Lab PDS / client + allowlisted ingest. |
| 2    | Manual              | After handle DNS/HTTP + `requestCrawl`. Public `bsky.network` only.      |

Tier 0 checks:

| Check              | Description                                                                            |
| ------------------ | -------------------------------------------------------------------------------------- |
| DID document       | `GET /atproto/users/{label}/did.json` parses as `did:web` via `@atproto/identity`      |
| Handle             | `com.atproto.identity.resolveHandle` returns that DID                                  |
| Public note        | Riddl `visibility: public` note is `app.bsky.feed.post` on `getRecord` / `listRecords` |
| Non-public         | `local` / `group` / `direct` notes do not appear in `listRecords`                      |
| Session split      | AT `createSession` JWT is rejected by Riddl `/api`                                     |
| AppView (optional) | `@atproto/api` `Agent` `getProfile` / `getAuthorFeed`                                  |

## Prerequisites

1. Local stack from the `run-openpeeps` skill (`pnpm dev`). API on
   `http://localhost:5173`.
2. `atproto.active: true` in core config, then **restart the API** so
   `/xrpc` mounts (`installAtproto` reads the flag at startup).
3. `atproto.handleDomain` matching the instance (default `localhost`).
   Override with `ATPROTO_HANDLE_DOMAIN` if you changed it.
4. A local account that can create public notes. The first registered
   account is owner and can also create groups.

Enable AT on a running owner session:

```bash
# After login, as owner:
curl -sS -X PATCH http://localhost:5173/api/openpeeps/core/v1/admin/config/openpeeps/core \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"config":{"atproto":{"active":true,"handleDomain":"localhost"}}}'
# Restart the API process, then re-run the script.
```

## Quick start

```bash
cd platform/tests/atproto
pnpm install --ignore-workspace
cp .env.example .env   # optional; env vars also work
node test-identity.mjs
```

| Variable                | Default                  | Purpose                                  |
| ----------------------- | ------------------------ | ---------------------------------------- |
| `ATPROTO_ORIGIN`        | `http://localhost:5173`  | API origin (`/xrpc` and `/api`)          |
| `ATPROTO_HANDLE_DOMAIN` | `localhost`              | Must match `atproto.handleDomain`        |
| `EMAIL`                 | `atproto@openpeeps.test` | Account used to create notes             |
| `PASSWORD`              | `atproto-test-12`        | Account password                         |
| `HANDLE`                | `atproto`                | OpenPeeps handle (AT label is sanitized) |
| `REGISTER`              | `1`                      | Register the account when login fails    |

The script creates a public note, a local note, a group note (when the
account can create groups), and a direct note to a second registered
user. Only the public note may show up as `app.bsky.feed.post`.

## Tier 1 — lab interop (compose still later)

`test-lab.mjs` probes `getRepo` (IPLD CAR) and `subscribeRepos` (CBOR
WebSocket). Once those pass, add the outbound client + allowlisted
ingest assertions in this script — do not start a second harness:

Outbound (we are the PDS):

- Reference client (goat / official lexicon client / Deer) logs in via
  `createSession` or OAuth+DPoP.
- Client `getProfile` / `getAuthorFeed` / `getPostThread` for
  `{label}.{handleDomain}`.
- Client `createRecord` of a public post; it appears in the Riddl feed
  as `visibility: public`.

Inbound (we ingest them):

- Peer host is on `atproto.allowedPdsHosts`.
- Ingest one `app.bsky.feed.post`; `posts.at_uri` is the **remote**
  AT-URI (no second minted id).
- A host not on the allowlist is dropped.

Intended compose (mirror ActivityPub): OpenPeeps + one reference PDS
(or a second OpenPeeps), Traefik TLS, fail-closed allowlists. Do not
subscribe to the full `bsky.network` firehose.

```bash
ATPROTO_TIER1=1 node test-lab.mjs   # fails until compose assertions exist
```

## Tier 2 — public Bluesky (optional)

Only after CAR, CBOR `subscribeRepos`, and handle DNS/HTTP. Manual
checklist is in
[`bluesky-compat.md`](../../../planning/at-protocol/bluesky-compat.md).
Keep `allowedPdsHosts` fail-closed. Do not crawl the full firehose.
