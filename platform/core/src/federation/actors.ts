import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import { allpeepDb } from '../db';
import { pgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { profiles } from '../db/pg/schema/documents';
import { profilesMapping } from '../profiles/mapping';
import { findProfileByHandleAndDomain, findProfileByUri } from './profiles';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

export type LocalActor = {
  id: string;
  handle: string;
  displayName?: string;
  bio?: string;
  avatar?: string | null;
  createdAt: string;
  deleted: boolean;
};

export type LocalActorKeys = {
  id: string;
  publicKeyPem: string;
  privateKeyPem: string;
  keyId: string | null;
};

export type RemoteActorInput = {
  uri: string;
  handle: string;
  domain: string;
  inboxUrl?: string | null;
  sharedInboxUrl?: string | null;
  publicKeyPem?: string | null;
  displayName?: string;
  bio?: string;
  avatar?: string | null;
};

type ProfileBody = {
  displayName?: string;
  bio?: string;
  avatar?: string | null;
};

export const federatedHandleFrom = (
  preferred: string | null | undefined,
  uri: string,
): string => {
  const fromName = (preferred ?? '')
    .replace(/[^a-zA-Z0-9_.-]/g, '')
    .slice(0, 64);
  if (fromName.length >= 1) return fromName;
  const fromUri = uri.replace(/[^a-zA-Z0-9]/g, '').slice(-16);
  return `actor-${fromUri || 'remote'}`;
};

const clipDisplayName = (name: string | undefined) =>
  name ? name.slice(0, 30) : undefined;

const bodyOf = (row: { body: unknown }): ProfileBody =>
  (row.body ?? {}) as ProfileBody;

export const loadLocalActor = async (
  profileId: string,
): Promise<LocalActor | null> => {
  const db = pgDb();
  const [row] = await db
    .select({
      id: profiles.id,
      handle: profiles.handle,
      type: profiles.type,
      body: profiles.body,
      createdAt: profiles.createdAt,
      deletedAt: profiles.deletedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (!row || row.type !== 'local') return null;
  const body = bodyOf(row);
  return {
    id: row.id,
    handle: row.handle,
    displayName: body.displayName,
    bio: body.bio,
    avatar: body.avatar,
    createdAt: row.createdAt,
    deleted: row.deletedAt != null,
  };
};

export const findLocalActorIdByHandle = async (
  handle: string,
): Promise<string | null> => {
  const db = pgDb();
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(
      and(
        eq(profiles.handle, handle),
        eq(profiles.type, 'local'),
        isNull(profiles.deletedAt),
      ),
    )
    .limit(1);
  return row?.id ?? null;
};

export const loadLocalActorKeys = async (
  profileId: string,
): Promise<LocalActorKeys | null> => {
  const db = pgDb();
  const [row] = await db
    .select({
      id: profiles.id,
      type: profiles.type,
      publicKeyPem: profiles.publicKeyPem,
      privateKeyPem: profiles.privateKeyPem,
      keyId: profiles.keyId,
      deletedAt: profiles.deletedAt,
    })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  if (
    !row ||
    row.type !== 'local' ||
    row.deletedAt != null ||
    !row.publicKeyPem ||
    !row.privateKeyPem
  ) {
    return null;
  }
  return {
    id: row.id,
    publicKeyPem: row.publicKeyPem,
    privateKeyPem: row.privateKeyPem,
    keyId: row.keyId,
  };
};

export const upsertRemoteActor = async (
  input: RemoteActorInput,
): Promise<ProfileWithMeta | undefined> => {
  const existing = await findProfileByUri(input.uri);
  const displayName = clipDisplayName(input.displayName);
  const db = pgDb();
  if (existing) {
    await db
      .update(profiles)
      .set({
        inboxUrl: input.inboxUrl ?? existing.inboxUrl,
        sharedInboxUrl: input.sharedInboxUrl ?? existing.sharedInboxUrl,
        publicKeyPem: input.publicKeyPem ?? existing.publicKeyPem,
        fetchedAt: nowIso(),
      })
      .where(eq(profiles.id, existing.id));
    if (displayName || input.bio || input.avatar) {
      await profilesMapping.update(
        await allpeepDb().then((d) => d.db),
        existing.id,
        {
          ...(displayName ? { displayName } : {}),
          ...(input.bio ? { bio: input.bio } : {}),
          ...(input.avatar ? { avatar: input.avatar } : {}),
        },
      );
    }
    return findProfileByUri(input.uri);
  }

  const handleTaken = await findProfileByHandleAndDomain(
    input.handle,
    input.domain,
  );
  const handle = handleTaken
    ? federatedHandleFrom(null, input.uri)
    : input.handle;

  const id = uuidv7();
  const actorFields = {
    uri: input.uri,
    inboxUrl: input.inboxUrl,
    sharedInboxUrl: input.sharedInboxUrl,
    publicKeyPem: input.publicKeyPem,
    fetchedAt: nowIso(),
  };
  await profilesMapping.create(await allpeepDb().then((d) => d.db), {
    id,
    handle,
    type: 'federated',
    activityPub: { domain: input.domain },
    displayName,
    bio: input.bio,
    avatar: input.avatar ?? undefined,
    ...actorFields,
  });
  return findProfileByUri(input.uri);
};
