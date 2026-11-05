# Libraries

Official `@atproto/*` packages only. Add each dependency to the workspace
package that owns the work. Core owns domain; server mounts HTTP; common
owns config and shared types.

Do not use Fedify, ActivityPub vocab, or a hand-rolled DID/MST for AT.
Do not use `@atproto/api` as the community write API — Riddl stays that.

## `@openpeepshq/core` — `src/atproto/`

Exported as `@openpeepshq/core/atproto` via the existing
`"./*": "./dist/*/index.js"` map in
[`platform/core/package.json`](../../platform/core/package.json).

| Package             | Why                                                                                              |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| `@atproto/syntax`   | Parse/format DID, NSID, TID, AT-URI. No stringly ids.                                            |
| `@atproto/lexicon`  | Validate `app.bsky.*` and later `org.openpeeps.*` records.                                       |
| `@atproto/identity` | Resolve `did:web` / `did:plc`, handle resolution helpers.                                        |
| `@atproto/crypto`   | Generate and use repo signing keys (not RSA from AP).                                            |
| `@atproto/repo`     | MST, commit, CAR export for the projection.                                                      |
| `@atproto/api`      | Record **types** (`AppBskyFeedPost`, …) only. Not the Bluesky service client as source of truth. |

Core must not import `@atproto/xrpc-server` or Express.

## `@openpeepshq/server` — `src/atproto/`

| Package                      | Why                                                                  | Phase  |
| ---------------------------- | -------------------------------------------------------------------- | ------ |
| `@atproto/xrpc-server`       | Register XRPC methods on the Express app.                            | 1      |
| `@atproto/sync`              | `subscribeRepos` frame encode/decode.                                | 2–3    |
| `@atproto/xrpc`              | Outbound XRPC client for ingest / resolve.                           | 3      |
| `@atproto/oauth-provider`    | Third-party AT clients log in as a local profile.                    | 5      |
| `@atproto/oauth-client-node` | Only if we later pull from a **remote** PDS as a user-linked client. | not v1 |

Server `installAtproto` mirrors
[`installFederation`](../../platform/server/src/federation/install.ts):
gate on config, mount routes, subscribe to `hub`.

## `@openpeepshq/common`

No AT runtime client. Add Zod config and small branded types only:

- `atproto.active`, `allowedPdsHosts`, `handleDomain`, `plcDirectory`,
  `ingestEnabled`, `relayUrl` next to `federation` /
  `activityPub` in
  [`platform/common/src/types/config.ts`](../../platform/common/src/types/config.ts)
- Types such as `AtDid`, `AtUri` if we do not re-export syntax types
  everywhere

## `@openpeepshq/worker`

Phase 3 ingest consumer uses `@atproto/sync` + `@atproto/xrpc` (or
depends on core helpers that wrap them). Long-lived `subscribeRepos` is
a worker/process, not an Express request handler.

## Web and RN

No AT client in v1. [`platform/react`](../../platform/react) and
[`platform/rn-components`](../../platform/rn-components) keep talking to
Riddl. A later optional profile field (DID / AT handle) is ordinary API
data, not `@atproto/api` in the browser.

## Do not add

| Temptation                               | Why not                                                              |
| ---------------------------------------- | -------------------------------------------------------------------- |
| Fedify AT plugin / AP vocab              | Wrong protocol.                                                      |
| Custom DID or MST                        | `@atproto/identity` and `@atproto/repo` exist.                       |
| `@atproto/api` `BskyAgent` as write path | Bypasses capabilities and `createPost`.                              |
| `atcute` / Skyware as the server         | Fine for experiments; production server uses official `xrpc-server`. |
| Ozone / labeler packages                 | Community moderation stays on OpenPeeps roles.                       |
| `chat.bsky` lexicons                     | DMs stay `visibility: 'direct'`.                                     |

## Version policy

Pin a single `@atproto/*` release line across core, server, and worker
(workspace catalog or matching semver). Lexicon breakage is coordinated.
Prefer the packages published from
[github.com/bluesky-social/atproto](https://github.com/bluesky-social/atproto).
