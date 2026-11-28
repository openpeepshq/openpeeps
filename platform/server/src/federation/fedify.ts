import './temporal';
import { createFederation, type Federation } from '@fedify/fedify';
import {
  Accept,
  Create,
  Endpoints,
  Follow,
  Image,
  Note,
  PUBLIC_COLLECTION,
  Person,
  Tombstone,
  Undo,
} from '@fedify/fedify/vocab';
import { PostgresKvStore, PostgresMessageQueue } from '@fedify/postgres';
import { createPost } from '@openpeepshq/core/posts';
import { config } from '@openpeepshq/core/config';
import { pgConnectionString } from '@openpeepshq/core/db';
import {
  ACCEPT_PATH,
  ACTOR_INBOX_PATH,
  ACTOR_PATH,
  CREATE_PATH,
  FOLLOWERS_PATH,
  NOTE_PATH,
  SHARED_INBOX_PATH,
  deleteOutboundFollow,
  federatedHandleFrom,
  federationOrigin,
  findApActivityByUri,
  findLocalActorIdByHandle,
  findOutboundFollow,
  findProfileByUri,
  ingestIncomingFollow,
  ingestIncomingUnfollow,
  listFederatedFollowerRecipients,
  loadLocalActor,
  loadLocalActorKeys,
  loadPublicNote,
  peerHostAllowed,
  recordApActivity,
  upsertRemoteActor,
} from '@openpeepshq/core/federation';
import type { Profile, ProfileWithMeta } from '@openpeepshq/common/types';
import { findProfile } from '@openpeepshq/core/profiles';
import { logger } from '@openpeepshq/core/log';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { importRsaPemPair } from './crypto';

const log = logger('server:federation');

type ActiveFederation = { federation: Federation<void>; origin: string };

/**
 * The federation instance mounted at server start, retained so request-time
 * callers (e.g. the profile-search remote-identity resolver) can reuse the
 * same WebFinger / document-loader configuration. `null` until
 * `installFederation` runs (and when federation is inactive).
 */
let activeFederation: ActiveFederation | null = null;

export const setActiveFederation = (value: ActiveFederation | null) => {
  activeFederation = value;
};

export const getActiveFederation = (): ActiveFederation | null =>
  activeFederation;

const documentLoaderOpts = (ctx: {
  documentLoader: unknown;
  contextLoader: unknown;
}) => ({
  documentLoader: ctx.documentLoader as never,
  contextLoader: ctx.contextLoader as never,
});

export const asText = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const text = String(value);
  return text.length > 0 ? text : undefined;
};

/** Uses the global `Temporal` (polyfilled by `./temporal` when the runtime lacks a native one) so the type matches @fedify/fedify's `Temporal.Instant`. */
const asInstant = (value: string) =>
  Temporal.Instant.fromEpochMilliseconds(new Date(value).getTime());

const asHttpUrl = (value: string | null | undefined): URL | undefined => {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url
      : undefined;
  } catch {
    return undefined;
  }
};

export const createOpenPeepsFederation = async () => {
  const cfg = await config();
  const origin = federationOrigin(cfg.activityPub.defaultDomain);
  const sql = postgres(pgConnectionString());
  const kv = new PostgresKvStore(sql);
  const queue = new PostgresMessageQueue(sql);
  await kv.initialize();
  await queue.initialize();

  const federation = createFederation<void>({
    kv,
    queue,
    origin,
    userAgent: { software: 'OpenPeeps', url: origin },
  });

  federation
    .setActorDispatcher(ACTOR_PATH, async (ctx, identifier) => {
      const actor = await loadLocalActor(identifier);
      if (!actor) return null;
      if (actor.deleted) {
        return new Tombstone({
          id: ctx.getActorUri(identifier),
          formerType: Person,
        });
      }
      const keys = await ctx.getActorKeyPairs(identifier);
      const first = keys[0];
      const iconUrl = asHttpUrl(actor.avatar);
      return new Person({
        id: ctx.getActorUri(identifier),
        preferredUsername: actor.handle,
        name: actor.displayName ?? actor.handle,
        summary: actor.bio,
        url: new URL(
          `https://${cfg.activityPub.defaultDomain}/@${actor.handle}`,
        ),
        published: asInstant(actor.createdAt),
        inbox: ctx.getInboxUri(identifier),
        followers: ctx.getFollowersUri(identifier),
        publicKey: first?.cryptographicKey,
        assertionMethods: keys.map((key) => key.multikey),
        endpoints: new Endpoints({ sharedInbox: ctx.getInboxUri() }),
        icon: iconUrl ? new Image({ url: iconUrl }) : undefined,
        // Publish discoverability only when explicitly opted-out; omit for
        // default/opted-in members so remote directories that honour the
        // flag don't get a listing of people who never made that choice.
        discoverable: actor.discoverable,
      });
    })
    .setKeyPairsDispatcher(async (_ctx, identifier) => {
      const keys = await loadLocalActorKeys(identifier);
      if (!keys) return [];
      return [await importRsaPemPair(keys.publicKeyPem, keys.privateKeyPem)];
    })
    .mapHandle(async (_ctx, username) => findLocalActorIdByHandle(username))
    .mapAlias((_ctx, resource) => {
      const match = /^\/@([^/]+)$/.exec(resource.pathname);
      if (!match?.[1]) return null;
      return { username: decodeURIComponent(match[1]) };
    });

  federation.setFollowersDispatcher(
    FOLLOWERS_PATH,
    async (_ctx, identifier) => {
      const actor = await loadLocalActor(identifier);
      if (!actor || actor.deleted) return null;
      const items = (await listFederatedFollowerRecipients(identifier)).map(
        (row) => ({
          id: new URL(row.uri),
          inboxId: new URL(row.inboxUrl),
          endpoints: row.sharedInboxUrl
            ? { sharedInbox: new URL(row.sharedInboxUrl) }
            : null,
        }),
      );
      return { items };
    },
  );

  federation.setObjectDispatcher(Note, NOTE_PATH, async (ctx, values) => {
    const note = await loadPublicNote(values.id);
    if (!note) return null;
    return new Note({
      id: ctx.getObjectUri(Note, { id: note.id }),
      attribution: ctx.getActorUri(note.creatorId),
      content: note.content,
      published: asInstant(note.published),
      to: PUBLIC_COLLECTION,
      cc: ctx.getFollowersUri(note.creatorId),
      replyTarget: note.inReplyToUri ? new URL(note.inReplyToUri) : undefined,
    });
  });

  federation.setObjectDispatcher(Create, CREATE_PATH, async (ctx, values) => {
    const uri = ctx.getObjectUri(Create, { id: values.id }).href;
    const row = await findApActivityByUri(uri);
    if (!row?.objectUri) return null;
    const noteId = row.objectUri.split('/').pop();
    if (!noteId) return null;
    const note = await loadPublicNote(noteId);
    if (!note) return null;
    return new Create({
      id: new URL(row.uri),
      actor: new URL(row.actorUri),
      object: ctx.getObjectUri(Note, { id: note.id }),
      to: PUBLIC_COLLECTION,
    });
  });

  federation.setObjectDispatcher(Accept, ACCEPT_PATH, async (ctx, values) => {
    const uri = ctx.getObjectUri(Accept, { id: values.id }).href;
    const row = await findApActivityByUri(uri);
    if (!row) return null;
    return new Accept({
      id: new URL(row.uri),
      actor: new URL(row.actorUri),
      object: row.objectUri ? new URL(row.objectUri) : undefined,
    });
  });

  federation
    .setInboxListeners(ACTOR_INBOX_PATH, SHARED_INBOX_PATH)
    .on(Follow, async (ctx, follow) => {
      try {
        const actorId = follow.actorId;
        if (!actorId || !(await peerHostAllowed(actorId))) return;
        const objectId = follow.objectId;
        if (!objectId) return;
        const parsed = ctx.parseUri(objectId);
        if (parsed?.type !== 'actor') return;
        const localActor = await loadLocalActor(parsed.identifier);
        if (!localActor || localActor.deleted) return;
        const remote = await follow.getActor(documentLoaderOpts(ctx));
        if (!remote?.id) return;
        const domain = remote.id.hostname.toLowerCase();
        if (domain.length < 4) return;
        const follower = await upsertRemoteActor({
          uri: remote.id.href,
          handle: federatedHandleFrom(
            asText(remote.preferredUsername),
            remote.id.href,
          ),
          domain,
          inboxUrl: remote.inboxId?.href,
          sharedInboxUrl: remote.endpoints?.sharedInbox?.href ?? null,
          displayName: asText(remote.name),
          bio: asText(remote.summary),
        });
        const followed = await findProfile(parsed.identifier);
        if (!follower || !followed) return;
        const followUri =
          follow.id?.href ?? `${remote.id.href}#follow-${parsed.identifier}`;
        await ingestIncomingFollow(follower, followed, followUri);
        const acceptId = uuidv7();
        const accept = new Accept({
          id: ctx.getObjectUri(Accept, { id: acceptId }),
          actor: ctx.getActorUri(parsed.identifier),
          object: follow,
          to: remote.id,
        });
        await recordApActivity({
          uri: accept.id!.href,
          type: 'Accept',
          actorUri: ctx.getActorUri(parsed.identifier).href,
          objectUri: followUri,
          direction: 'out',
        });
        await ctx.sendActivity(
          { identifier: parsed.identifier },
          remote,
          accept,
          { preferSharedInbox: true },
        );
      } catch (error: unknown) {
        log.error('Failed to handle Follow activity', error);
      }
    })
    .on(Undo, async (ctx, undo) => {
      const actorId = undo.actorId;
      if (!actorId || !(await peerHostAllowed(actorId))) return;
      const object = await undo.getObject(documentLoaderOpts(ctx));
      if (!(object instanceof Follow)) return;
      const objectId = object.objectId;
      if (!objectId) return;
      const parsed = ctx.parseUri(objectId);
      if (parsed?.type !== 'actor') return;
      const follower = await findProfileByUri(actorId.href);
      const followed = await findProfile(parsed.identifier);
      if (!follower || !followed) return;
      await ingestIncomingUnfollow(
        follower,
        followed,
        undo.id?.href ?? actorId.href,
      );
    })
    .on(Accept, async (_ctx, accept) => {
      const actorId = accept.actorId;
      if (!actorId || !(await peerHostAllowed(actorId)) || !accept.id) return;
      await recordApActivity({
        uri: accept.id.href,
        type: 'Accept',
        actorUri: actorId.href,
        objectUri: accept.objectId?.href,
        direction: 'in',
      });
    })
    .on(Create, async (ctx, create) => {
      try {
        const actorId = create.actorId;
        if (!actorId || !(await peerHostAllowed(actorId))) return;

        const createUri = create.id?.href;
        if (!createUri) return;
        // Deduplicate: skip if we already ingested this Create activity.
        if (await findApActivityByUri(createUri)) return;

        const remote = await create.getActor(documentLoaderOpts(ctx));
        if (!remote?.id) return;

        const domain = remote.id.hostname.toLowerCase();
        if (domain.length < 4) return;

        const remoteActor = await upsertRemoteActor({
          uri: remote.id.href,
          handle: federatedHandleFrom(
            asText(remote.preferredUsername),
            remote.id.href,
          ),
          domain,
          inboxUrl: remote.inboxId?.href,
          sharedInboxUrl: remote.endpoints?.sharedInbox?.href ?? null,
          displayName: asText(remote.name),
          bio: asText(remote.summary),
        });
        if (!remoteActor) return;

        const noteObj = await create.getObject(documentLoaderOpts(ctx));
        if (!noteObj || !(noteObj instanceof Note)) return;

        const content = asText(noteObj.content) ?? '';
        await createPost(
          { type: 'note', content },
          remoteActor,
          { type: 'note', visibility: 'public', creatorId: remoteActor.id },
          {},
        );

        await recordApActivity({
          uri: createUri,
          type: 'Create',
          actorUri: remote.id.href,
          objectUri: noteObj.id?.href ?? createUri,
          direction: 'in',
        });
      } catch (error: unknown) {
        log.error('Failed to handle Create activity', error);
      }
    });

  return { federation, origin };
};

export const federatePublicNote = async (
  federation: Federation<void>,
  origin: string,
  post: {
    id: string;
    creatorId: string;
    visibility: string;
    data?: { type?: string };
  },
) => {
  if (post.visibility !== 'public' || post.data?.type !== 'note') return;
  const actor = await loadLocalActor(post.creatorId);
  if (!actor || actor.deleted) return;
  const note = await loadPublicNote(post.id);
  if (!note) return;
  const ctx = federation.createContext(new URL(`${origin}/`), undefined);
  const createId = uuidv7();
  const create = new Create({
    id: ctx.getObjectUri(Create, { id: createId }),
    actor: ctx.getActorUri(note.creatorId),
    object: ctx.getObjectUri(Note, { id: note.id }),
    to: PUBLIC_COLLECTION,
    cc: ctx.getFollowersUri(note.creatorId),
  });
  await recordApActivity({
    uri: create.id!.href,
    type: 'Create',
    actorUri: ctx.getActorUri(note.creatorId).href,
    objectUri: ctx.getObjectUri(Note, { id: note.id }).href,
    direction: 'out',
  });
  await ctx.sendActivity({ identifier: note.creatorId }, 'followers', create, {
    preferSharedInbox: true,
  });
};

/**
 * Canonical local actor URI for AP activity `actor` fields. Derived from the
 * `ACTOR_PATH` template (the same one `ctx.getActorUri` resolves), so the two
 * forms can't drift (#241 review #4).
 */
const localActorUri = (origin: string, profileId: string) =>
  new URL(
    origin.replace(/\/$/, '') + ACTOR_PATH.replace('{identifier}', profileId),
  );

export const federateFollow = async (
  federation: Federation<void>,
  origin: string,
  follower: Profile,
  followed: ProfileWithMeta,
) => {
  if (followed.type !== 'federated') return;
  if (!followed.uri || !followed.inboxUrl) return;
  // Never send a Follow to a host on the federation blocklist (deny wins).
  if (!(await peerHostAllowed(followed.uri))) return;

  const actorUri = localActorUri(origin, follower.id);

  // Idempotency + audit (#241): every outbound Follow is recorded before it
  // is sent, and re-follows of an already-followed remote actor (e.g. the
  // follow-schedule worker re-applying the same relationship) skip the send.
  // The check must key off the same canonical actor URI that `recordApActivity`
  // stores below — `follower.uri` is not reliably backfilled for local
  // profiles, so `localActorUri` is the stable form. The Undo listener keys off
  // this row, so it is the "we followed them" marker that keeps local-only
  // edges from producing Undo spam.
  //
  // The row is normally deleted when the edge goes away (federateUnfollow).
  // A row found here for a freshly re-created edge is therefore stale — left
  // behind when the edge was deleted without a federated Undo (e.g. blocking,
  // which deletes edges in core without emitting `followDeleted`). Clear it
  // and re-send so the remote host learns about the re-follow (#241 review #1).
  if (await findOutboundFollow(actorUri.href, followed.uri)) {
    await deleteOutboundFollow(actorUri.href, followed.uri);
  }

  const ctx = federation.createContext(new URL(`${origin}/`), undefined);
  const followId = uuidv7();
  const follow = new Follow({
    id: new URL(`${origin}/ap/objects/${followId}`),
    actor: actorUri,
    // Wrap the actor URI in a Person Object so Fedify's Follow constructor
    // accepts it (it requires Object|URL, not plain strings) and the
    // router doesn't try to resolve the remote URL.
    object: new Person({ id: new URL(followed.uri) }),
  });
  await recordApActivity({
    uri: follow.id!.href,
    type: 'Follow',
    actorUri: actorUri.href,
    objectUri: followed.uri,
    direction: 'out',
  });
  await ctx.sendActivity(
    { identifier: follower.id },
    {
      id: new URL(followed.uri),
      inboxId: new URL(followed.inboxUrl),
      endpoints: followed.sharedInboxUrl
        ? { sharedInbox: new URL(followed.sharedInboxUrl) }
        : undefined,
    },
    follow,
    { preferSharedInbox: true },
  );
};

/**
 * Send `Undo(Follow)` for an unfollow of a remote actor — but only for
 * follows we actually sent (#241). The `ap_activities` guard makes
 * schedule-driven and remote-initiated edges (where they followed *us*)
 * silent local deletions, so no Undo spam on unrelated unfollows.
 */
export const federateUnfollow = async (
  federation: Federation<void>,
  origin: string,
  follower: Profile,
  followed: ProfileWithMeta,
) => {
  if (followed.type !== 'federated') return;
  if (!followed.uri || !followed.inboxUrl) return;

  // Same canonical local-actor URI that `federateFollow` recorded, so the
  // lookup finds the outbound Follow row (and stays silent when we never
  // followed them — e.g. they followed *us*, or a schedule-only edge).
  const actorUri = localActorUri(origin, follower.id);
  const recorded = await findOutboundFollow(actorUri.href, followed.uri);
  if (!recorded) return;

  const ctx = federation.createContext(new URL(`${origin}/`), undefined);
  const undoId = uuidv7();
  const undo = new Undo({
    id: new URL(`${origin}/ap/objects/${undoId}`),
    actor: actorUri,
    // Embed the Follow instead of a bare URI (review #3): remotes that
    // dereference the Undo's object (Mastodon does) would otherwise hit a
    // URI we cannot serve — there is no Follow object dispatcher on
    // `/ap/objects/…`, so the GET resolves through the Note dispatcher and
    // 404s, and the unfollow may be silently ignored.
    object: new Follow({
      id: new URL(recorded.uri),
      actor: actorUri,
      object: new Person({ id: new URL(followed.uri) }),
    }),
  });
  await recordApActivity({
    uri: undo.id!.href,
    type: 'Undo',
    actorUri: actorUri.href,
    objectUri: recorded.uri,
    direction: 'out',
  });
  await ctx.sendActivity(
    { identifier: follower.id },
    {
      id: new URL(followed.uri),
      inboxId: new URL(followed.inboxUrl),
      endpoints: followed.sharedInboxUrl
        ? { sharedInbox: new URL(followed.sharedInboxUrl) }
        : undefined,
    },
    undo,
    { preferSharedInbox: true },
  );

  // Drop the outbound Follow row once the Undo is sent, so the ledger mirrors
  // the live follow edge and a re-follow re-sends a fresh Follow (#241 review
  // #1) — otherwise the re-follow would find this stale row and silently
  // return, leaving the remote host unaware of it.
  await deleteOutboundFollow(actorUri.href, followed.uri);
};
