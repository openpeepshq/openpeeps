# Core integration

Mirror the ActivityPub seam. Do **not** extend
[`platform/core/src/federation/`](../../platform/core/src/federation/).

## New module

`platform/core/src/atproto/` with a barrel `index.ts` so imports are
`@openpeepshq/core/atproto` (one subpath segment, per AGENTS.md).

| File          | Responsibility                                                                 |
| ------------- | ------------------------------------------------------------------------------ |
| `identity.ts` | `did:web` document, handle ↔ profile, signing key material                    |
| `repos.ts`    | Project public profile/posts into records + commit snapshot                    |
| `records.ts`  | Map `app.bsky.feed.post` / `actor.profile` / `graph.follow` / `feed.like`      |
| `ingest.ts`   | Allowlisted inbound records → `createPost` / follow / upsert federated profile |
| `peers.ts`    | `atprotoIsActive`, `pdsHostAllowed` (empty list = fail closed)                 |
| `blobs.ts`    | CID ↔ `mediaStorage`                                                          |
| `index.ts`    | Public exports only                                                            |

Copy the AP split: server Fedify code calls core; core does not import
server. Inbound AP already calls `createPost` and `follow` from
[`ingest.ts`](../../platform/core/src/federation/ingest.ts) /
[`fedify.ts`](../../platform/server/src/federation/fedify.ts) — AT ingest
does the same.

## Schema

Drizzle under `platform/core/src/db/pg/schema/`, then

```bash
pnpm --filter @openpeepshq/core db:generate -- --name atproto_identity_and_repos
```

Filename must stay snake_case (`NNNN_atproto_identity_and_repos.sql`).
See [postgres-schema-adr](../../platform/core/docs/postgres-schema-adr.md).
Keep only the latest `meta/NNNN_snapshot.json`.

### Columns on existing tables

`profiles`:

- `did` text unique nullable (local after backfill; required for AT-federated)
- `at_handle` text unique nullable
- `pds_endpoint` text nullable (null = this instance for locals)
- `at_signing_public_key` / `at_signing_private_key` text nullable
  (core-owned secrets, same care as `privateKeyPem`)

`posts`:

- `at_uri` text unique nullable
- `cid` text nullable
- leave `uri` / `inReplyToUri` for ActivityPub

Remote AT actors: `profiles.type = 'federated'` with `did` set and AP
`inboxUrl` null. Do not put a DID in `uri`.

### New tables

`at_records`:

- `did`, `collection`, `rkey` (unique together)
- `cid`, `rev`
- optional `post_id` / `profile_id` / `follow` edge id

`at_repo_commits`:

- `did`, `rev` unique together
- `commit_cid`
- CAR or MST snapshot bytes (or storage id if large)

`at_blobs`:

- `cid` unique
- `did`
- `media_id` (existing media row)

Optional later: an AT analog of `ap_activities` if we need an ingest
ledger beyond `at_records` + `posts.at_uri`. Prefer `at_records` as the
dedup key.

### Backfill

AP has `backfillLocalFederationIdentities` in
[`identity.ts`](../../platform/core/src/federation/identity.ts). AT needs
the same shape: after migrate, assign `did:web` + keys to local profiles
that should be addressable. Do not backfill guests unless product says so.
Do not project historical non-public posts.

## Config

Add next to `federation` / `activityPub` in
[`platform/common/src/types/config.ts`](../../platform/common/src/types/config.ts):

```ts
atproto: z.object({
  active: z.boolean(),
  /** PDS host patterns. Empty = fail closed. */
  allowedPdsHosts: z.array(z.string()).default([]),
  handleDomain: z.string(),
  plcDirectory: z.string().optional(),
  ingestEnabled: z.boolean().default(false),
  relayUrl: z.string().optional(),
}),
```

Keep `allowedPdsHosts` **separate** from `federation.allowedHosts`. An
AP peer is not automatically an AT peer.

`peers.ts` copies
[`federation/peers.ts`](../../platform/core/src/federation/peers.ts):
`hostnameOf` + `hostIsAllowed` from `@openpeepshq/common/lib`.

## Hub

Existing events in
[`platform/core/src/events/index.ts`](../../platform/core/src/events/index.ts)
that AT cares about:

| Event                    | AT action                                               |
| ------------------------ | ------------------------------------------------------- |
| `profileCreated`         | Ensure `did:web` + keys                                 |
| `postCreated`            | Project public note; skip others                        |
| `followCreated`          | Project `app.bsky.graph.follow` if both sides have DIDs |
| `reactionCreated`        | Phase 4+ designated like only                           |
| `profileSettingsUpdated` | Refresh `app.bsky.actor.profile`                        |

Not in `CoreEvents` today but needed for a correct repo: post delete /
update. When those emits exist (or when delete already happens in
mutations), subscribe there and `deleteRecord` / put a new record +
commit. Do not add unused event keys “just in case.”

Hub wiring lives in server install, same as
[`installFederation`](../../platform/server/src/federation/install.ts):

```ts
// platform/server/src/atproto/install.ts
export const installAtproto = async (app: Express) => {
  if (!(await atprotoIsActive())) return;
  mountWellKnown(app);
  app.use('/xrpc', atprotoXrpcRouter);
  hub.on('postCreated', (post) => {
    void projectPublicNote(post).catch((error: unknown) => {
      log.error('Failed to project public note', error);
    });
  });
  hub.on('followCreated', (follower, followed) => {
    void projectFollow(follower, followed).catch((error: unknown) => {
      log.error('Failed to project follow', error);
    });
  });
  hub.on('profileCreated', (profile) => {
    void ensureDidWeb(profile).catch((error: unknown) => {
      log.error('Failed to ensure did:web', error);
    });
  });
};
```

Projection of a single record may stay in-process (AP does this). CAR
rebuild of large repos and all inbound firehose work go to
`platform/worker` (AGENTS.md: async work is not inline on the request
path).

## Server mount

Call `installAtproto` from
[`platform/server/src/server.ts`](../../platform/server/src/server.ts)
after the Riddl `/api/` delegate and **beside** `installFederation` — not
inside the Fedify middleware.

Constraints:

- `/xrpc` and `/.well-known/atproto-did` must not match `isApiRequest`.
- Do not apply `express.json()` to CAR download or `subscribeRepos`.
- `subscribeRepos` is a WebSocket (or chunked CBOR stream per lexicon);
  register it on the same HTTP server, not on Riddl.
- Fedify comment in `server.ts` still applies: Fedify must not consume
  API POST bodies. AT routers must be equally narrow.

Well-known routes are documented in [endpoints.md](./endpoints.md).

## Write path from XRPC (phase 4+)

`com.atproto.repo.createRecord` for `app.bsky.feed.post`:

1. Authenticate AT session / OAuth → local profile.
2. Authorize the same capability `createPost` uses on Riddl.
3. Reject collections outside the v1 allowlist.
4. `createPost({ type: 'note', … }, profile, { visibility: 'public', … })`.
5. Hub projects; `at_records` insert is idempotent on `(did, collection, rkey)`.

Follow and like go through existing profile/reaction mutations, not a
parallel social graph.

## Media

[`mediaStorage()`](../../platform/core/src/media/index.ts) stays the
blob store. `uploadBlob` writes through existing helpers, computes CID,
inserts `at_blobs`. `getBlob` / `sync.getBlob` stream from storage.
GC must treat `at_blobs.media_id` as a reference (add to
`REFERENCE_TABLES` in media GC when the table exists).

## Tests

- Unit: identity URL builders, public-note gate, allowlist, record
  mapping (Vitest in `platform/core`, same as
  [`identity.test.ts`](../../platform/core/src/federation/identity.test.ts)).
- Server: XRPC method registration and well-known documents.
- E2E: new harness beside
  [`platform/tests/activitypub/`](../../platform/tests/activitypub/) —
  two OpenPeeps instances, optional third-party PDS. See
  [phases.md](./phases.md#test-strategy).
