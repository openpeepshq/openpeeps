# Endpoints

No new Riddl endpoints are required for v1. The existing app keeps using
`/api/openpeeps/core/v1/*`. AT lives on well-known URLs and `/xrpc/*`.

Optional later (not v1): `GET /api/openpeeps/core/v1/profiles/:id/atproto`
to expose DID / AT handle in web and RN.

## Well-known and DID documents

Required for any AT peer to find this instance.

| Method | Path                              | Purpose                                                         | Phase               |
| ------ | --------------------------------- | --------------------------------------------------------------- | ------------------- |
| GET    | `/.well-known/did.json`           | Instance `did:web` if we publish one for the host               | 1                   |
| GET    | `/.well-known/atproto-did`        | Handle → DID when the request Host is `{handle}.{handleDomain}` | 1 (if wildcard DNS) |
| GET    | `/atproto/users/:handle/did.json` | Path-based user `did:web` document                              | 1                   |

DID document must include:

- `id` — the `did:web`
- `verificationMethod` — repo signing key
- `service` — `#atproto_pds` pointing at `https://{handleDomain}` (XRPC origin)

Do not serve these from `/ap/users/…`. AP actor documents stay on
[`ACTOR_PATH`](../../platform/core/src/federation/identity.ts).

## XRPC — identity and read-only repo (phase 1)

| NSID                                 | Role                                                    |
| ------------------------------------ | ------------------------------------------------------- |
| `com.atproto.server.describeServer`  | Advertise this PDS-lite, available user domains         |
| `com.atproto.identity.resolveHandle` | `{handle}.{handleDomain}` → DID                         |
| `com.atproto.repo.describeRepo`      | Handle, DID, collections for a local (or ingested) repo |
| `com.atproto.repo.getRecord`         | One record by `repo` + `collection` + `rkey`            |
| `com.atproto.repo.listRecords`       | Paginated collection list                               |

Phase 1 is local public projection only. Unknown DIDs 404.

## XRPC — sync (phase 2)

So other AppViews / relays can crawl **this instance’s** repos.

| NSID                               | Role                                       |
| ---------------------------------- | ------------------------------------------ |
| `com.atproto.sync.getRepo`         | CAR of a DID’s repo                        |
| `com.atproto.sync.getLatestCommit` | Current rev / commit CID                   |
| `com.atproto.sync.getRepoStatus`   | Active / takedown                          |
| `com.atproto.sync.getRecord`       | Proof of one record                        |
| `com.atproto.sync.getBlob`         | Public blob bytes                          |
| `com.atproto.sync.listBlobs`       | CIDs for a DID                             |
| `com.atproto.sync.listRepos`       | DIDs hosted here                           |
| `com.atproto.sync.subscribeRepos`  | WebSocket firehose of **local** repos only |

`subscribeRepos` must not proxy the public network.

## XRPC — AppView-lite reads (phase 3)

Community-local index. Not a global Bluesky AppView.

| NSID                              | Maps to                                       |
| --------------------------------- | --------------------------------------------- |
| `app.bsky.actor.getProfile`       | Local or ingested federated profile           |
| `app.bsky.actor.getProfiles`      | Batch of the above                            |
| `app.bsky.feed.getAuthorFeed`     | Public notes by one DID                       |
| `app.bsky.feed.getPosts`          | Hydrate AT-URIs we already store              |
| `app.bsky.feed.getPostThread`     | Reply tree using `posts.at_uri` / `inReplyTo` |
| `app.bsky.graph.getFollows`       | Follows we know for that DID                  |
| `app.bsky.graph.getFollowers`     | Inverse                                       |
| `app.bsky.graph.getRelationships` | Pairwise follow state                         |

Do **not** implement `app.bsky.feed.getTimeline` as a global following
feed. OpenPeeps already has its own feeds on Riddl.

## XRPC — write (phase 4–5)

All capability-gated. Collections limited to the v1 lexicon set.

| NSID                                | Role                                  | Auth                       |
| ----------------------------------- | ------------------------------------- | -------------------------- |
| `com.atproto.repo.createRecord`     | Create post / follow / like / profile | Session (4) then OAuth (5) |
| `com.atproto.repo.putRecord`        | Update profile or replace record      | same                       |
| `com.atproto.repo.deleteRecord`     | Delete own record → core delete       | same                       |
| `com.atproto.repo.applyWrites`      | Batch of the above                    | same                       |
| `com.atproto.repo.uploadBlob`       | → `mediaStorage` + `at_blobs`         | same                       |
| `com.atproto.server.createSession`  | MVP password/session                  | 4 only                     |
| `com.atproto.server.refreshSession` | Rotate session                        | 4 only                     |
| `com.atproto.server.getSession`     | Current session                       | 4 only                     |
| `com.atproto.server.getServiceAuth` | If another service must call us       | 5 if needed                |

Phase 5 replaces `createSession` with `@atproto/oauth-provider`. Do not
accept a community JWT as an XRPC bearer token — that would mix auth
worlds and skip DPoP.

## Lexicons we emit / accept in v1

- `app.bsky.actor.profile`
- `app.bsky.feed.post`
- `app.bsky.graph.follow`
- `app.bsky.feed.like` (phase 4+)

## Explicitly out of v1

| Surface                                           | Why                                          |
| ------------------------------------------------- | -------------------------------------------- |
| `chat.bsky.*`                                     | DMs stay `visibility: 'direct'`              |
| `tools.ozone.*`                                   | Moderation stays on OpenPeeps roles          |
| `app.bsky.unspecced.*`                            | Unstable Bluesky-app APIs                    |
| Video / starterpacks / feeds generator            | No product mapping                           |
| `app.bsky.feed.getTimeline` as global AppView     | Wrong product                                |
| PLC `com.atproto.identity.*` write / submitPlc    | No portable DID in v1                        |
| `com.atproto.sync.requestCrawl` as a public relay | We are not a relay                           |
| New Riddl write APIs                              | UI already writes via existing posts/follows |

## Error and auth behavior

- Unknown or disallowed host / DID: fail closed (`UnknownRepo` /
  `InvalidRequest`), never a partial public leak of local/group/direct.
- Inactive `atproto.active`: `/xrpc` is not mounted (same as
  `installFederation` returning early).
- Writes without a mapped local profile: 401.
- Writes that would create non-public visibility: 400. AT cannot express
  group or direct.
