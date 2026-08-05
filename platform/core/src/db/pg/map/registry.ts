import * as documents from '../schema/documents';
import * as edges from '../schema/edges';
import {
  modelTimestampsFromRow,
  rowToModel,
  type RowTimestamps,
} from '../mappers';

// Drizzle table handles are passed through dynamic lookups; keep loose typing.
export type PgTable = unknown;

export const asTable = (table: PgTable): Record<string, unknown> =>
  table as Record<string, unknown>;

export type DocumentConfig = {
  kind: 'document';
  table: PgTable;
  splitPatch: (data: Record<string, unknown>) => {
    scalars: Record<string, unknown>;
    body: Record<string, unknown>;
  };
};

export type EdgeConfig = {
  kind: 'edge';
  table: PgTable;
  fromCollection: string;
  toCollection: string;
};

export type CollectionConfig = DocumentConfig | EdgeConfig;

const bodyOnly = (data: Record<string, unknown>) => ({
  scalars: {},
  body: { ...data },
});

const withScalars =
  (...scalarKeys: string[]) =>
  (data: Record<string, unknown>) => {
    const scalars: Record<string, unknown> = {};
    const body: Record<string, unknown> = { ...data };
    for (const key of scalarKeys) {
      if (key in body) {
        scalars[key] = body[key];
        delete body[key];
      }
    }
    return { scalars, body };
  };

const postsSplit = (data: Record<string, unknown>) => {
  const { type, visibility, creatorId, data: postBody, ...rest } = data;
  const scalars: Record<string, unknown> = {};
  if (type !== undefined) scalars.type = type;
  if (visibility !== undefined) scalars.visibility = visibility;
  if (creatorId !== undefined) scalars.creatorId = creatorId;
  const body =
    postBody !== undefined ? { ...(postBody as object) } : { ...rest };
  if (postBody === undefined) {
    delete (body as Record<string, unknown>).type;
    delete (body as Record<string, unknown>).visibility;
    delete (body as Record<string, unknown>).creatorId;
  }
  return { scalars, body };
};

const profilesSplit = (data: Record<string, unknown>) => {
  const { handle, type, activityPub, ...rest } = data;
  const scalars: Record<string, unknown> = {};
  if (handle !== undefined) scalars.handle = handle;
  if (type !== undefined) scalars.type = type;
  if (activityPub !== undefined) {
    const domain = (activityPub as { domain?: string }).domain;
    if (domain !== undefined) scalars.activityPubDomain = domain;
  }
  return { scalars, body: { ...rest } };
};

/** App model uses `tag`; Postgres column is `name`. */
const hashtagsSplit = (data: Record<string, unknown>) => {
  const normalized = { ...data };
  if ('tag' in normalized && !('name' in normalized)) {
    normalized.name = normalized.tag;
    delete normalized.tag;
  }
  if (typeof normalized.name === 'string') {
    normalized.name = normalized.name.trim().toLowerCase();
  }
  return withScalars('name')(normalized);
};

/** Arango jam events use jamId; Postgres column is post_id. */
const jamEventsSplit = (data: Record<string, unknown>) => {
  const { postId, jamId, ...rest } = data;
  const scalars: Record<string, unknown> = {};
  const resolvedPostId = postId ?? jamId;
  if (resolvedPostId !== undefined) {
    scalars.postId = resolvedPostId;
  }
  return { scalars, body: { ...rest } };
};

/** Legacy settings docs use profile id as document id, not profileId. */
const profileSettingsSplit = (data: Record<string, unknown>) => {
  const { profileId, id, ...rest } = data;
  const scalars: Record<string, unknown> = {};
  const resolvedProfileId = profileId ?? id;
  if (resolvedProfileId !== undefined) {
    scalars.profileId = resolvedProfileId;
  }
  return { scalars, body: { ...rest } };
};

export const documentRegistry: Record<string, DocumentConfig> = {
  accounts: {
    kind: 'document',
    table: documents.accounts,
    splitPatch: withScalars('email', 'passwordHash', 'emailValidated', 'guest'),
  },
  profiles: {
    kind: 'document',
    table: documents.profiles,
    splitPatch: profilesSplit,
  },
  posts: {
    kind: 'document',
    table: documents.posts,
    splitPatch: postsSplit,
  },
  groups: {
    kind: 'document',
    table: documents.groups,
    splitPatch: withScalars('handle'),
  },
  hashtags: {
    kind: 'document',
    table: documents.hashtags,
    splitPatch: hashtagsSplit,
  },
  roles: {
    kind: 'document',
    table: documents.roles,
    splitPatch: withScalars('key', 'isDefault'),
  },
  notifications: {
    kind: 'document',
    table: documents.notifications,
    splitPatch: withScalars('profileId'),
  },
  reports: {
    kind: 'document',
    table: documents.reports,
    splitPatch: bodyOnly,
  },
  accessTokens: {
    kind: 'document',
    table: documents.accessTokens,
    splitPatch: bodyOnly,
  },
  pushSubscriptions: {
    kind: 'document',
    table: documents.pushSubscriptions,
    splitPatch: bodyOnly,
  },
  inviteLinks: {
    kind: 'document',
    table: documents.inviteLinks,
    splitPatch: withScalars('slug'),
  },
  jamEvents: {
    kind: 'document',
    table: documents.jamEvents,
    splitPatch: jamEventsSplit,
  },
  mediaAttachments: {
    kind: 'document',
    table: documents.mediaAttachments,
    splitPatch: bodyOnly,
  },
  processingStats: {
    kind: 'document',
    table: documents.processingStats,
    splitPatch: withScalars('filetype', 'filesize'),
  },
  profileSettings: {
    kind: 'document',
    table: documents.profileSettings,
    splitPatch: profileSettingsSplit,
  },
  configs: {
    kind: 'document',
    table: documents.configs,
    splitPatch: bodyOnly,
  },
  i18n: {
    kind: 'document',
    table: documents.i18nEntries,
    splitPatch: withScalars('locale', 'namespace'),
  },
  dataMigrations: {
    kind: 'document',
    table: documents.dataMigrations,
    splitPatch: bodyOnly,
  },
};

export const edgeRegistry: Record<string, EdgeConfig> = {
  follows: {
    kind: 'edge',
    table: edges.follows,
    fromCollection: 'profiles',
    toCollection: 'profiles',
  },
  requestsFollow: {
    kind: 'edge',
    table: edges.requestsFollow,
    fromCollection: 'profiles',
    toCollection: 'profiles',
  },
  controls: {
    kind: 'edge',
    table: edges.controls,
    fromCollection: 'accounts',
    toCollection: 'profiles',
  },
  mentions: {
    kind: 'edge',
    table: edges.mentions,
    fromCollection: 'posts',
    toCollection: 'profiles',
  },
  audience: {
    kind: 'edge',
    table: edges.audience,
    fromCollection: 'posts',
    toCollection: 'profiles',
  },
  postHashtags: {
    kind: 'edge',
    table: edges.postHashtags,
    fromCollection: 'posts',
    toCollection: 'hashtags',
  },
  entries: {
    kind: 'edge',
    table: edges.entries,
    fromCollection: 'profiles',
    toCollection: 'posts',
  },
  reactions: {
    kind: 'edge',
    table: edges.reactions,
    fromCollection: 'profiles',
    toCollection: 'posts',
  },
  replyTo: {
    kind: 'edge',
    table: edges.replyTo,
    fromCollection: 'posts',
    toCollection: 'posts',
  },
  repost: {
    kind: 'edge',
    table: edges.repost,
    fromCollection: 'posts',
    toCollection: 'posts',
  },
  bookmarks: {
    kind: 'edge',
    table: edges.bookmarks,
    fromCollection: 'profiles',
    toCollection: 'posts',
  },
  postSeen: {
    kind: 'edge',
    table: edges.postSeen,
    fromCollection: 'profiles',
    toCollection: 'posts',
  },
  hasSeen: {
    kind: 'edge',
    table: edges.hasSeen,
    fromCollection: 'profiles',
    toCollection: 'posts',
  },
  hasRead: {
    kind: 'edge',
    table: edges.hasRead,
    fromCollection: 'profiles',
    toCollection: 'notifications',
  },
  userGroups: {
    kind: 'edge',
    table: edges.userGroups,
    fromCollection: 'profiles',
    toCollection: 'groups',
  },
  postGroups: {
    kind: 'edge',
    table: edges.postGroups,
    fromCollection: 'posts',
    toCollection: 'groups',
  },
  hasRole: {
    kind: 'edge',
    table: edges.hasRole,
    fromCollection: 'profiles',
    toCollection: 'roles',
  },
  profileAccessTokens: {
    kind: 'edge',
    table: edges.profileAccessTokens,
    fromCollection: 'profiles',
    toCollection: 'accessTokens',
  },
  accountToPushSubscription: {
    kind: 'edge',
    table: edges.accountToPushSubscription,
    fromCollection: 'accounts',
    toCollection: 'pushSubscriptions',
  },
  createdReport: {
    kind: 'edge',
    table: edges.createdReport,
    fromCollection: 'profiles',
    toCollection: 'reports',
  },
  isReportedProfile: {
    kind: 'edge',
    table: edges.isReportedProfile,
    fromCollection: 'reports',
    toCollection: 'profiles',
  },
  isReportedObject: {
    kind: 'edge',
    table: edges.isReportedObject,
    fromCollection: 'reports',
    toCollection: 'posts',
  },
  inviteLinkCreators: {
    kind: 'edge',
    table: edges.inviteLinkCreators,
    fromCollection: 'inviteLinks',
    toCollection: 'profiles',
  },
  inviteLinkRedeemers: {
    kind: 'edge',
    table: edges.inviteLinkRedeemers,
    fromCollection: 'inviteLinks',
    toCollection: 'profiles',
  },
  jamRecordings: {
    kind: 'edge',
    table: edges.jamRecordings,
    fromCollection: 'profiles',
    toCollection: 'posts',
  },
};

export const getCollectionConfig = (
  collection: string,
): CollectionConfig | undefined =>
  documentRegistry[collection] ?? edgeRegistry[collection];

export const getTableForCollection = (collection: string): PgTable => {
  const config = getCollectionConfig(collection);
  if (!config) {
    throw new Error(`Unknown collection: ${collection}`);
  }
  return config.table;
};

export const isEdgeCollection = (collection: string): boolean =>
  collection in edgeRegistry;

export const parseDocRef = (
  ref: string,
): { collection: string; id: string } | undefined => {
  const slash = ref.indexOf('/');
  if (slash <= 0) return undefined;
  return { collection: ref.slice(0, slash), id: ref.slice(slash + 1) };
};

export const docRef = (collection: string, id: string) => `${collection}/${id}`;

const rowTimestamps = (row: RowTimestamps) => modelTimestampsFromRow(row);

export const rowToDocument = (
  collection: string,
  row: Record<string, unknown>,
  keepMetadata = false,
): Record<string, unknown> => {
  const config = getCollectionConfig(collection);
  if (!config) {
    throw new Error(`Unknown collection: ${collection}`);
  }

  const timestamps = rowTimestamps(row as RowTimestamps);

  if (config.kind === 'edge') {
    const fromId = row.fromId as string;
    const toId = row.toId as string;
    // Body fields first; row id / edge refs / timestamps always win so a
    // stale body.id (from older inserts) cannot shadow the primary key.
    const base = {
      ...((row.body ?? {}) as Record<string, unknown>),
      id: row.id as string,
      _from: docRef(config.fromCollection, fromId),
      _to: docRef(config.toCollection, toId),
      createdAt: timestamps.createdAt,
      updatedAt: timestamps.updatedAt,
    };
    return keepMetadata ? base : base;
  }

  switch (collection) {
    case 'accounts':
      return rowToModel(
        row.id as string,
        {
          email: row.email,
          passwordHash: row.passwordHash,
          emailValidated: row.emailValidated,
          guest: row.guest ?? undefined,
        },
        timestamps,
      );
    case 'profiles':
      return rowToModel(
        row.id as string,
        {
          handle: row.handle,
          type: row.type,
          ...(row.activityPubDomain
            ? { activityPub: { domain: row.activityPubDomain } }
            : {}),
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    case 'posts':
      return rowToModel(
        row.id as string,
        {
          type: row.type,
          visibility: row.visibility,
          creatorId: row.creatorId,
          data: row.body ?? {},
        },
        timestamps,
      );
    case 'groups':
      return rowToModel(
        row.id as string,
        {
          handle: row.handle,
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    case 'hashtags':
      return rowToModel(row.id as string, { tag: row.name }, timestamps);
    case 'roles':
      return rowToModel(
        row.id as string,
        {
          key: row.key,
          isDefault: row.isDefault,
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    case 'notifications':
      return rowToModel(
        row.id as string,
        {
          profileId: row.profileId,
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    case 'jamEvents':
      return rowToModel(
        row.id as string,
        {
          jamId: row.postId,
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    case 'processingStats':
      return rowToModel(
        row.id as string,
        {
          filetype: row.filetype,
          filesize: row.filesize,
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    case 'profileSettings':
      return rowToModel(
        row.profileId as string,
        (row.body ?? {}) as Record<string, unknown>,
        timestamps,
      );
    case 'inviteLinks':
      return rowToModel(
        row.id as string,
        {
          slug: row.slug,
          ...((row.body ?? {}) as Record<string, unknown>),
        },
        timestamps,
      );
    default:
      return rowToModel(
        row.id as string,
        (row.body ?? {}) as Record<string, unknown>,
        timestamps,
      );
  }
};

export const searchViewCollections: Record<string, string> = {
  groupSearch: 'groups',
  profileSearch: 'profiles',
  postSearch: 'posts',
};
