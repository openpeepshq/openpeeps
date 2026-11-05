# Architectural problems

These are product constraints, not implementation nits. Each item names the
ActivityPub precedent (or the lack of one) so AT does not repeat a known
seam or inherit a missing fix.

## 1. Community vs global identity

AT assumes a portable DID and a global firehose. OpenPeeps actors are
community-scoped HTTPS URLs with RSA keys
([`identity.ts`](../../platform/core/src/federation/identity.ts):
`ACTOR_PATH = '/ap/users/{identifier}'`). Membership, roles, and
`core-*` capabilities are instance-local.

**Decision:** v1 uses instance-bound `did:web`. No PLC creation, no repo
migration. A user who leaves the community does not take a portable
OpenPeeps identity onto another PDS.

## 2. Visibility vs public repos

AT records in a repo are public. OpenPeeps posts have
`public | local | unlisted | group | direct | private`
([`isPublic` / `isDirect` / …](../../platform/core/src/posts/helpers/index.ts)).

ActivityPub already gates outbound notes with
[`loadPublicNote`](../../platform/core/src/federation/notes.ts)
(`type === 'note' && visibility === 'public'`).

**Decision:** reuse that gate. Direct, group, local, unlisted, and private
never become `app.bsky.feed.post` and never appear on `subscribeRepos`.
Direct content must not become globally retrievable corpus — same invariant
as the AI layer.

## 3. Do not overload AP columns

[`profiles`](../../platform/core/src/db/pg/schema/documents.ts) already has
`uri`, `inboxUrl`, `publicKeyPem` / `privateKeyPem` (RSA),
`activityPubDomain`, unique `(handle, activity_pub_domain)` and unique
`uri`. [`posts`](../../platform/core/src/db/pg/schema/documents.ts) has
`uri` / `inReplyToUri` for AP object URLs.

AT needs DID, AT handle, PDS endpoint, and secp256k1/P-256 signing keys.

**Decision:** new columns and tables. Never store a DID in `profiles.uri`.
Never put an `at://` id in `posts.uri`.

## 4. Existing inbound URI minting

AP inbound `Create` in
[`fedify.ts`](../../platform/server/src/federation/fedify.ts) calls
`createPost` and records the remote Note id only on
`ap_activities.object_uri`. The new row gets a local `/ap/objects/{id}`
when local scalars are applied. Replies and updates cannot reliably point
at the remote object.

**Decision:** AT ingest stores the canonical
`at://{did}/app.bsky.feed.post/{rkey}` and CID on the post (`posts.at_uri`,
`posts.cid` or `at_records`). Dedup on that AT-URI. Do not invent a second
AT identity for inbound records.

## 5. Postgres is source of truth; MST is a projection

Making `@atproto/repo` the write path would rewrite `createPost`,
visibility, group links, and every hub consumer. ActivityPub did the
right thing: Fedify is an adapter around core mutations.

**Decision:** OpenPeeps UI writes stay Riddl → core. CAR/MST is a derived
commit for `com.atproto.sync.*`. XRPC writes (phase 4+) enter through the
same mutations, then project idempotently.

## 6. Groups have no AT equivalent

Bluesky lists and starter packs are not membership + capabilities.
[`groups`](../../platform/core/src/db/pg/schema/documents.ts) and
`visibility: 'group'` are community features.

**Decision:** do not map groups to lists. Custom `org.openpeeps.*`
lexicons are phase 6 and invisible to the Bluesky AppView. Group posts
never hit the firehose.

## 7. Auth mismatch

OpenPeeps uses community JWT + role capabilities on
`/api/openpeeps/core/v1/*`. AT clients use OAuth 2.1 DPoP (or legacy app
passwords / `createSession`). Peeps-AI already states the rule: service
credentials authenticate services; they do not substitute for requester
authorization.

**Decision:** external `createRecord` maps to a local profile and calls
the same capability-gated mutations. Session/OAuth must not expand
access. v1 reads are public-repo only; writes wait for phase 4–5.

## 8. Reactions vs likes

OpenPeeps `reactionCreated` carries emoji
([`CoreEvents`](../../platform/core/src/events/index.ts)). AT
`app.bsky.feed.like` is a single like record with a subject AT-URI.

**Decision:** v1 outbound does not project emoji reactions. A later phase
may map one designated like. Other reactions stay local.

## 9. Handles

AP is `handle` + `activity_pub_domain` (unique together). AT handles are
DNS names (`alice.community.example`) resolved via DNS TXT, HTTP
`.well-known/atproto-did`, or `resolveHandle`.

Guest and federated AP handles can collide with a desired AT hostname
label. Wildcard DNS + TLS for `{handle}.{handleDomain}` is an ops cost
most community hosts will not want.

**Decision:** persist `at_handle` separately. v1 resolves via
`com.atproto.identity.resolveHandle` on this instance. Document wildcard
DNS as optional for foreign AppViews. Sanitize AT handle labels the same
way [`federatedHandleFrom`](../../platform/core/src/federation/actors.ts)
sanitizes AP usernames.

## 10. Express mount conflict

[`server.ts`](../../platform/server/src/server.ts) delegates `/api/*` to
Riddl, then `installFederation`. Fedify must not see API POSTs (body
stream). XRPC needs `/xrpc/*`, well-known DID routes, and a WebSocket
for `subscribeRepos`.

**Decision:** install AT beside Fedify, not inside it. Do not run the
JSON / urlencoded parsers on CAR, CBOR, or the firehose socket. Exclude
`/xrpc` and `/.well-known/atproto-did` from the `/api/` delegate (same
pattern as `isApiRequest`).

## 11. Firehose cost

`subscribeRepos` on `bsky.network` is the whole public network. ActivityPub
is already fail-closed on empty `federation.allowedHosts`
([`peers.ts`](../../platform/core/src/federation/peers.ts)).

**Decision:** inbound subscribe is allowlisted PDS/DID only. Outbound
`subscribeRepos` serves **this instance’s repos only**. Do not run a
public relay. Optional `atproto.relayUrl` is publish-to-a-hosted-relay,
not “become the relay.”

## 12. Media

AT blobs are CID-addressed and public once listed on the repo. OpenPeeps
already has [`mediaStorage`](../../platform/core/src/media/index.ts) and
GC.

**Decision:** `uploadBlob` / `getBlob` wrap `mediaStorage`. `at_blobs`
maps CID → media id. Private / group / DM media never gets a public blob
CID. No second blob store.

## 13. Long-form and live types

Articles, events, jams, polls, RSVPs have no `app.bsky` lexicon. AP also
does not federate them today (notes + follows only).

**Decision:** skip on the firehose. Phase 6 may add `org.openpeeps.*`
served only by our AppView-lite. Bluesky clients will ignore them.

## 14. This is core, not a plugin

Plugin routes live under `/api/openpeeps/core/v1/plugins` and cannot own
instance identity. Fedify is in `platform/core` + `platform/server` for
that reason.

**Decision:** `@openpeepshq/core/atproto` + `platform/server/src/atproto`.
A plugin must not own DIDs, `/xrpc`, or signing keys.

## Rejected alternatives

### Full portable PDS + `did:plc`

Would make OpenPeeps a generic PDS. Account migration (`com.atproto.sync`

- PLC update) would move the repo off the community while roles,
  groups, and billing stay behind. Rejected for v1 and likely forever for
  community membership.

### AppView / client-only into Bluesky

Link a bsky.social account and dual-post via `@atproto/api`. No local
DID, no `/xrpc` other instances can call, no inbound AT identity. That
is account linking. Out of scope for “implement AT Protocol in
OpenPeeps.”

### AP↔AT bridge

Translate `Create Note` ↔ `app.bsky.feed.post` without first-class AT
repos. Two lossy hops, no DID, and it would encode today’s inbound URI
minting as a feature. Rejected.

## Open questions that do not block v1

- Whether a later phase offers optional `did:plc` **in addition** to
  `did:web` for users who want a Bluesky-portable public persona (still
  not community membership).
- Whether wildcard DNS is provided by the community-app host template.
- Whether inbound allowlists share syntax with `federation.allowedHosts`
  or stay a separate `atproto.allowedPdsHosts` (recommend separate).
