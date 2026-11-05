# Phases

One concern per PR. Do not combine identity, ingest, and OAuth.

## Phase 1 — Identity + read-only PDS-lite

**Ship:** `did:web` documents, handle resolution, `describeServer`,
`describeRepo`, `getRecord`, `listRecords` for **local** public notes
already in Postgres.

**Code:**

- Config + `peers.ts` (`atprotoIsActive`, fail-closed allowlist unused
  until phase 3 but present)
- Schema + backfill (`did`, keys, `at_handle`)
- `identity.ts`, `records.ts`, `repos.ts` projection **on read** (or a
  one-shot backfill of `at_records` for existing public notes)
- `installAtproto` well-known + XRPC read methods
- No hub writes required if reads project on the fly; prefer materializing
  `at_records` so phase 2 commits are incremental

**Tests:** DID document shape, handle → DID, public-note gate (non-public
404s), Vitest in core + a thin server test for `describeServer`.

**Not in this PR:** firehose, ingest, OAuth, UI.

## Phase 2 — Outbound projection + local sync

**Ship:** hub listeners write `at_records` + `at_repo_commits`.
`com.atproto.sync.getRepo`, `getLatestCommit`, `listRepos`,
`subscribeRepos` (local repos only). `getBlob` / `listBlobs` if a public
note already has public media.

**Code:**

- `hub.on('profileCreated' | 'postCreated' | 'followCreated')` in
  `installAtproto`
- Worker job if CAR rebuild is heavy
- `@atproto/repo` + `@atproto/sync`

**Tests:** creating a public note via `createPost` produces a gettable
record and a new commit; local/group/direct notes do not; delete (when
wired) drops the record.

## Phase 3 — Allowlisted ingest + AppView-lite

**Ship:** worker consumes `subscribeRepos` from `allowedPdsHosts`. Upsert
`type=federated` profiles by DID. `createPost` with canonical `at_uri`.
AppView-lite read methods for profiles, author feeds, threads, follows.

**Code:**

- `ingest.ts` + worker consumer
- `atproto.ingestEnabled` gate
- Dedup on `at_uri` (do not repeat AP inbound URI minting)

**Tests:** e2e harness (below) with a second OpenPeeps or a fixture PDS;
unknown hosts dropped; duplicate commits idempotent.

## Phase 4 — Write XRPC + session

**Ship:** `createRecord` / `putRecord` / `deleteRecord` / `applyWrites` /
`uploadBlob` + `createSession` MVP. Capability-gated. Public collections
only.

**Tests:** session cannot create `visibility: 'group'`; uploadBlob GC
reference; unauthorized 401.

## Phase 5 — OAuth provider

**Ship:** `@atproto/oauth-provider` so real AT clients (Deer, official
app, etc.) can log in without copying the community JWT. Deprecate
`createSession` or keep it as a debug-only path.

**Tests:** DPoP-bound token cannot be replayed as a Riddl JWT; scopes
cannot grant admin capabilities.

## Phase 6 — Custom lexicons (optional)

**Ship:** `org.openpeeps.*` for groups/events **only if** our AppView-lite
serves them. Still never on the public Bluesky index. Skip entirely if
product does not need foreign AT clients to see those types.

## Test strategy

Mirror [`platform/tests/activitypub/`](../../platform/tests/activitypub/):
Traefik, two OpenPeeps instances, fail-closed allowlists, scripted
checks.

| Check                                                   | Phase |
| ------------------------------------------------------- | ----- |
| DID document + `resolveHandle`                          | 1     |
| `getRecord` of a public note created via Riddl          | 1–2   |
| Non-public note absent from `listRecords` / firehose    | 2     |
| `getRepo` CAR verifies with `@atproto/repo`             | 2     |
| Instance B ingests instance A’s public note by `at_uri` | 3     |
| Host not on `allowedPdsHosts` is ignored                | 3     |
| XRPC createRecord appears in Riddl feed as public note  | 4     |
| Direct/group never returned by `getPostThread`          | 3–4   |

Unit tests stay in-package (`pnpm --filter @openpeepshq/core test`,
server, worker). Do not stand up the e2e compose for ordinary PRs.

ActivityPub e2e stays independent. A post may be checked on both
protocols in a later combined job; do not block AP tests on AT.

## Suggested PR cut

1. Config + schema + identity documents (phase 1a)
2. Read XRPC (phase 1b)
3. Hub projection + sync (phase 2)
4. Ingest worker (phase 3a)
5. AppView-lite reads (phase 3b)
6. Write XRPC + session (phase 4)
7. OAuth (phase 5)

Each PR: conventional commit, no CHANGELOG edit, bump only packages
touched, web/RN only if a display field is added (then both sides).
