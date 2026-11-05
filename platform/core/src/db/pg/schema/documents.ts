import {
  boolean,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { bytea, idColumn, modelTimestamps, tsvector } from './base';

export const configs = pgTable('configs', {
  key: text('key').primaryKey(),
  body: jsonb('body').notNull(),
  ...modelTimestamps,
});

export const i18nEntries = pgTable(
  'i18n',
  {
    id: idColumn(),
    locale: text('locale').notNull(),
    namespace: text('namespace').notNull(),
    body: jsonb('body').notNull(),
    ...modelTimestamps,
  },
  (t) => [uniqueIndex('i18n_locale_namespace').on(t.locale, t.namespace)],
);

export const accounts = pgTable(
  'accounts',
  {
    id: idColumn(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    emailValidated: boolean('email_validated').notNull().default(false),
    guest: boolean('guest'),
    ...modelTimestamps,
  },
  (t) => [uniqueIndex('accounts_email_unique').on(t.email)],
);

export const profiles = pgTable(
  'profiles',
  {
    id: idColumn(),
    handle: text('handle').notNull(),
    activityPubDomain: text('activity_pub_domain'),
    type: text('type').notNull(),
    uri: text('uri'),
    inboxUrl: text('inbox_url'),
    sharedInboxUrl: text('shared_inbox_url'),
    publicKeyPem: text('public_key_pem'),
    privateKeyPem: text('private_key_pem'),
    keyId: text('key_id'),
    fetchedAt: timestamp('fetched_at', { withTimezone: true, mode: 'string' }),
    did: text('did'),
    atHandle: text('at_handle'),
    pdsEndpoint: text('pds_endpoint'),
    atSigningPublicKey: text('at_signing_public_key'),
    atSigningPrivateKey: text('at_signing_private_key'),
    body: jsonb('body').notNull().default({}),
    searchVector: tsvector('search_vector'),
    ...modelTimestamps,
  },
  (t) => [
    uniqueIndex('profiles_handle_domain_unique').on(
      t.handle,
      t.activityPubDomain,
    ),
    uniqueIndex('profiles_uri_unique').on(t.uri),
    uniqueIndex('profiles_did_unique').on(t.did),
    uniqueIndex('profiles_at_handle_unique').on(t.atHandle),
    index('profiles_search_vector_idx').using('gin', t.searchVector),
  ],
);

export const roles = pgTable(
  'roles',
  {
    id: idColumn(),
    key: text('key').notNull(),
    isDefault: boolean('is_default').notNull().default(false),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [uniqueIndex('roles_key_unique').on(t.key)],
);

export const hashtags = pgTable(
  'hashtags',
  {
    id: idColumn(),
    name: text('name').notNull(),
    ...modelTimestamps,
  },
  (t) => [uniqueIndex('hashtags_name_unique').on(t.name)],
);

export const groups = pgTable(
  'groups',
  {
    id: idColumn(),
    handle: text('handle').notNull(),
    body: jsonb('body').notNull().default({}),
    searchVector: tsvector('search_vector'),
    ...modelTimestamps,
  },
  (t) => [
    uniqueIndex('groups_handle_unique').on(t.handle),
    index('groups_search_vector_idx').using('gin', t.searchVector),
  ],
);

export const posts = pgTable(
  'posts',
  {
    id: idColumn(),
    type: text('type').notNull(),
    visibility: text('visibility').notNull(),
    creatorId: text('creator_id').notNull(),
    uri: text('uri'),
    inReplyToUri: text('in_reply_to_uri'),
    atUri: text('at_uri'),
    cid: text('cid'),
    body: jsonb('body').notNull().default({}),
    searchVector: tsvector('search_vector'),
    lastActivityAt: timestamp('last_activity_at', {
      withTimezone: true,
      mode: 'string',
    })
      .notNull()
      .default(sql`now()`),
    ...modelTimestamps,
  },
  (t) => [
    index('posts_type_idx').on(t.type),
    index('posts_visibility_idx').on(t.visibility),
    index('posts_creator_idx').on(t.creatorId),
    uniqueIndex('posts_uri_unique').on(t.uri),
    uniqueIndex('posts_at_uri_unique').on(t.atUri),
    index('posts_in_reply_to_uri_idx').on(t.inReplyToUri),
    index('posts_search_vector_idx').using('gin', t.searchVector),
    index('posts_last_activity_id_idx').on(t.lastActivityAt, t.id),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: idColumn(),
    profileId: text('profile_id').notNull(),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [index('notifications_profile_idx').on(t.profileId)],
);

export const reports = pgTable('reports', {
  id: idColumn(),
  body: jsonb('body').notNull().default({}),
  ...modelTimestamps,
});

export const accessTokens = pgTable('access_tokens', {
  id: idColumn(),
  body: jsonb('body').notNull().default({}),
  ...modelTimestamps,
});

export const pushSubscriptions = pgTable('push_subscriptions', {
  id: idColumn(),
  body: jsonb('body').notNull().default({}),
  ...modelTimestamps,
});

export const inviteLinks = pgTable(
  'invite_links',
  {
    id: idColumn(),
    slug: text('slug').notNull(),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [uniqueIndex('invite_links_slug_unique').on(t.slug)],
);

export const jamEvents = pgTable(
  'jam_events',
  {
    id: idColumn(),
    postId: text('post_id').notNull(),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [index('jam_events_post_idx').on(t.postId)],
);

export const mediaAttachments = pgTable('media_attachments', {
  id: idColumn(),
  body: jsonb('body').notNull().default({}),
  ...modelTimestamps,
});

export const processingStats = pgTable(
  'processing_stats',
  {
    id: idColumn(),
    filetype: text('filetype').notNull(),
    filesize: text('filesize').notNull(),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [
    index('processing_stats_filetype_idx').on(t.filetype),
    index('processing_stats_filetype_size_idx').on(t.filetype, t.filesize),
  ],
);

export const profileSettings = pgTable(
  'profile_settings',
  {
    id: idColumn(),
    profileId: text('profile_id').notNull(),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [uniqueIndex('profile_settings_profile_unique').on(t.profileId)],
);

export const eventOccurrences = pgTable(
  'event_occurrences',
  {
    id: idColumn(),
    postId: uuid('post_id').notNull(),
    recurrenceId: timestamp('recurrence_id', {
      withTimezone: true,
      mode: 'string',
    }).notNull(),
    start: timestamp('start', { withTimezone: true, mode: 'string' }).notNull(),
    end: timestamp('end', { withTimezone: true, mode: 'string' }),
    cancelled: boolean('cancelled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (t) => [
    uniqueIndex('event_occurrences_post_recurrence').on(
      t.postId,
      t.recurrenceId,
    ),
    index('event_occurrences_start_idx').on(t.start),
    index('event_occurrences_post_idx').on(t.postId),
  ],
);

export const apActivities = pgTable('ap_activities', {
  uri: text('uri').primaryKey(),
  type: text('type').notNull(),
  actorUri: text('actor_uri').notNull(),
  objectUri: text('object_uri'),
  direction: text('direction').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const atRecords = pgTable(
  'at_records',
  {
    id: idColumn(),
    did: text('did').notNull(),
    collection: text('collection').notNull(),
    rkey: text('rkey').notNull(),
    cid: text('cid').notNull(),
    rev: text('rev').notNull(),
    record: jsonb('record').notNull().default({}),
    postId: text('post_id'),
    profileId: text('profile_id'),
    followId: text('follow_id'),
    ...modelTimestamps,
  },
  (t) => [
    uniqueIndex('at_records_did_collection_rkey').on(
      t.did,
      t.collection,
      t.rkey,
    ),
    index('at_records_did_idx').on(t.did),
    uniqueIndex('at_records_did_cid').on(t.did, t.cid),
  ],
);

export const atRepoCommits = pgTable(
  'at_repo_commits',
  {
    id: idColumn(),
    did: text('did').notNull(),
    rev: text('rev').notNull(),
    commitCid: text('commit_cid').notNull(),
    prev: text('prev'),
    car: bytea('car'),
    snapshot: jsonb('snapshot').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [
    uniqueIndex('at_repo_commits_did_rev').on(t.did, t.rev),
    index('at_repo_commits_did_idx').on(t.did),
  ],
);

export const atBlobs = pgTable(
  'at_blobs',
  {
    id: idColumn(),
    cid: text('cid').notNull(),
    did: text('did').notNull(),
    mediaId: text('media_id').notNull(),
    mimeType: text('mime_type'),
    body: jsonb('body').notNull().default({}),
    ...modelTimestamps,
  },
  (t) => [
    uniqueIndex('at_blobs_cid_unique').on(t.cid),
    index('at_blobs_did_idx').on(t.did),
    index('at_blobs_media_id_idx').on(t.mediaId),
  ],
);
