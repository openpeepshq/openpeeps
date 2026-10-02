import './temporal';
import { Temporal } from '@js-temporal/polyfill';
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
  federatedHandleFrom,
  federationOrigin,
  findApActivityByUri,
  findLocalActorIdByHandle,
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
import { findProfile } from '@openpeepshq/core/profiles';
import { logger } from '@openpeepshq/core/log';
import postgres from 'postgres';
import { uuidv7 } from 'uuidv7';
import { importRsaPemPair } from './crypto';

const log = logger('server:federation');

const documentLoaderOpts = (ctx: {
  documentLoader: unknown;
  contextLoader: unknown;
}) => ({
  documentLoader: ctx.documentLoader as never,
  contextLoader: ctx.contextLoader as never,
});

const asText = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  const text = String(value);
  return text.length > 0 ? text : undefined;
};

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
