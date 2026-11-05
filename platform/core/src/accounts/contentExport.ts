import { and, asc, eq, inArray, isNull, not, or, sql } from 'drizzle-orm';
import {
  accountContentExportSchema,
  jamRecordingKindSchema,
  jamRecordingStatusSchema,
  postTypeSchema,
  rsvpResponseSchema,
  visibilityTypeSchema,
  type AccountContentExport,
  type ExportedAttachment,
  type ExportedPost,
  type ExportedProfileRef,
} from '@openpeepshq/common/types';
import { database } from '../db';
import { normalizeIsoDatetime } from '../db/pg/mappers';
import {
  accessTokens,
  accountToPushSubscription,
  audience,
  blocks,
  bookmarks,
  createdReport,
  entries,
  follows,
  groups,
  hashtags,
  hasRole,
  inviteLinkCreators,
  inviteLinkRedeemers,
  inviteLinks,
  jamEvents,
  jamRecordings,
  mentions,
  notifications,
  postGroups,
  postSeen,
  posts,
  profileAccessTokens,
  profileHashtags,
  profileSettings,
  profiles,
  pushSubscriptions,
  replyTo,
  reports,
  repost,
  requestsFollow,
  roles,
  userGroups,
} from '../db/pg/schema';

export type ContentPostRow = {
  id: string;
  profileId: string;
  type: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
  body: unknown;
  author?: {
    id: string;
    handle: string;
    body: unknown;
  } | null;
  inReplyToId?: string | null;
  repostOfId?: string | null;
  groupId?: string | null;
  deletedAt?: string | null;
};

export type ContentProfileEdgeRow = {
  id: string;
  handle: string;
  body: unknown;
  since: string;
};

export type ContentBookmarkRow = {
  postId: string;
  createdAt: string;
  post: ContentPostRow | null;
};

export type ContentEntryRow = {
  id?: string;
  postId: string;
  createdAt: string;
  body: unknown;
  post: ContentPostRow | null;
};

export type ContentRecordingRow = {
  id: string;
  profileId: string;
  eventPostId: string;
  createdAt: string;
  body: unknown;
};

export type OwnedProfileRow = {
  id: string;
  handle: string;
  type: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  body: unknown;
  domain?: string | null;
  uri?: string | null;
  inboxUrl?: string | null;
  sharedInboxUrl?: string | null;
  publicKeyPem?: string | null;
  privateKeyPem?: string | null;
  keyId?: string | null;
};

export type ContentExportRows = {
  profiles: OwnedProfileRow[];
  settings: { profileId: string; body: unknown }[];
  roles: { profileId: string; id: string; key: string; body: unknown }[];
  memberships: {
    groupId: string;
    handle: string;
    body: unknown;
    edgeBody: unknown;
    since: string;
    profileId: string;
  }[];
  followedHashtags: { profileId: string; name: string }[];
  posts: ContentPostRow[];
  followers: ContentProfileEdgeRow[];
  following: ContentProfileEdgeRow[];
  followRequests: (ContentProfileEdgeRow & {
    direction: 'sent' | 'received';
  })[];
  blocks: ContentProfileEdgeRow[];
  bookmarks: ContentBookmarkRow[];
  entries: ContentEntryRow[];
  reposts: { postId: string; repostOfId: string; createdAt: string }[];
  mentions: { postId: string; createdAt: string; body: unknown }[];
  directMessages: ContentBookmarkRow[];
  seenPosts: { postId: string; seenAt: string }[];
  notifications: {
    id: string;
    profileId: string;
    createdAt: string;
    updatedAt: string;
    deletedAt?: string | null;
    body: unknown;
  }[];
  reports: { id: string; createdAt: string; body: unknown }[];
  accessTokens: {
    id: string;
    createdAt: string;
    updatedAt: string;
    body: unknown;
  }[];
  pushSubscriptions: { id: string; createdAt: string; body: unknown }[];
  invites: {
    id: string;
    slug: string;
    relationship: 'created' | 'redeemed';
    createdAt: string;
    body: unknown;
  }[];
  jamRecordings: ContentRecordingRow[];
  jamActivity: {
    id: string;
    jamId: string;
    createdAt: string;
    body: unknown;
  }[];
};

const textOf = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

const recordOf = (value: unknown): Record<string, unknown> | undefined =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;

const copyObject = (value: unknown): Record<string, unknown> => ({
  ...(recordOf(value) ?? {}),
});

const omit = (value: unknown, keys: readonly string[]) => {
  const next = copyObject(value);
  for (const key of keys) delete next[key];
  return next;
};

const attachmentsOf = (value: unknown): ExportedAttachment[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const row = recordOf(item);
    const url = textOf(row?.url);
    const filename = textOf(row?.filename);
    if (!row || !url || !filename) return [];
    return [
      {
        type: textOf(row.type) ?? 'file',
        url,
        filename,
      },
    ];
  });
};

const authorOf = (author: ContentPostRow['author']): ExportedPost['author'] => {
  if (!author) return undefined;
  const displayName = textOf(recordOf(author.body)?.displayName);
  return {
    id: author.id,
    handle: author.handle,
    ...(displayName ? { displayName } : {}),
  };
};

const postFromRow = (row: ContentPostRow): ExportedPost | undefined => {
  const type = postTypeSchema.safeParse(row.type);
  const visibility = visibilityTypeSchema.safeParse(row.visibility);
  if (!type.success || !visibility.success) return undefined;
  const body = recordOf(row.body) ?? {};
  const location = textOf(recordOf(body.physicalLocation)?.text);
  const author = authorOf(row.author);
  return {
    id: row.id,
    profileId: row.profileId,
    type: type.data,
    visibility: visibility.data,
    createdAt: normalizeIsoDatetime(row.createdAt),
    updatedAt: normalizeIsoDatetime(row.updatedAt),
    ...(textOf(body.content) ? { content: textOf(body.content) } : {}),
    ...(textOf(body.title) ? { title: textOf(body.title) } : {}),
    ...(textOf(body.name) ? { name: textOf(body.name) } : {}),
    ...(textOf(body.start) ? { start: textOf(body.start) } : {}),
    ...(textOf(body.end) ? { end: textOf(body.end) } : {}),
    ...(typeof body.wholeDay === 'boolean' ? { wholeDay: body.wholeDay } : {}),
    ...(location ? { location } : {}),
    ...(textOf(body.url) ? { url: textOf(body.url) } : {}),
    ...(recordOf(body.jam) ? { jam: true } : {}),
    ...(row.inReplyToId ? { inReplyToId: row.inReplyToId } : {}),
    ...(row.repostOfId ? { repostOfId: row.repostOfId } : {}),
    ...(row.groupId ? { groupId: row.groupId } : {}),
    ...(row.deletedAt
      ? { deletedAt: normalizeIsoDatetime(row.deletedAt) }
      : {}),
    data: body,
    ...(author ? { author } : {}),
    attachments: attachmentsOf(body.attachments),
  };
};

const profileRef = (row: ContentProfileEdgeRow): ExportedProfileRef => {
  const body = recordOf(row.body) ?? {};
  const displayName = textOf(body.displayName);
  const avatar = textOf(body.avatar);
  return {
    id: row.id,
    handle: row.handle,
    ...(displayName ? { displayName } : {}),
    ...(avatar ? { avatar } : {}),
    since: normalizeIsoDatetime(row.since),
  };
};

/** One row per person, keeping the earliest relationship. */
const earliestProfiles = (
  rows: ContentProfileEdgeRow[],
): ExportedProfileRef[] => {
  const sorted = [...rows].sort((a, b) => (a.since < b.since ? -1 : 1));
  const seen = new Set<string>();
  return sorted.flatMap((row) => {
    if (seen.has(row.id)) return [];
    seen.add(row.id);
    return [profileRef(row)];
  });
};

const entryType = (body: unknown): string | undefined =>
  textOf(recordOf(body)?.type);

const reactionOf = (body: unknown): string | undefined =>
  textOf(recordOf(recordOf(body)?.data)?.reaction);

const activeFavorites = (rows: ContentEntryRow[]) => {
  const latest = new Map<string, ContentEntryRow>();
  const sorted = [...rows]
    .filter((row) => {
      const type = entryType(row.body);
      return type === 'reaction' || type === 'unreaction';
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const row of sorted) {
    const reaction = reactionOf(row.body);
    if (!reaction) continue;
    latest.set(`${row.postId}\0${reaction}`, row);
  }
  return [...latest.values()].flatMap((row) => {
    if (entryType(row.body) !== 'reaction') return [];
    const reaction = reactionOf(row.body);
    if (!reaction) return [];
    const post = row.post ? postFromRow(row.post) : undefined;
    return [
      {
        postId: row.postId,
        reaction,
        createdAt: normalizeIsoDatetime(row.createdAt),
        ...(post ? { post } : {}),
      },
    ];
  });
};

const currentRsvps = (rows: ContentEntryRow[]) => {
  const latest = new Map<string, ContentEntryRow>();
  const sorted = [...rows]
    .filter((row) => entryType(row.body) === 'rsvp')
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
  for (const row of sorted) {
    const data = recordOf(recordOf(row.body)?.data);
    const recurrenceId = textOf(data?.recurrenceId) ?? '';
    latest.set(`${row.postId}\0${recurrenceId}`, row);
  }
  return [...latest.values()].flatMap((row) => {
    const data = recordOf(recordOf(row.body)?.data);
    const response = rsvpResponseSchema.safeParse(data?.response);
    if (!response.success) return [];
    const recurrenceId = textOf(data?.recurrenceId);
    const event = row.post ? postFromRow(row.post) : undefined;
    return [
      {
        eventPostId: row.postId,
        response: response.data,
        ...(recurrenceId ? { recurrenceId } : {}),
        createdAt: normalizeIsoDatetime(row.createdAt),
        ...(event ? { event } : {}),
      },
    ];
  });
};

const recordingFromRow = (row: ContentRecordingRow) => {
  const body = recordOf(row.body) ?? {};
  const status = jamRecordingStatusSchema.safeParse(body.status);
  if (!status.success) return undefined;
  const kind = jamRecordingKindSchema.safeParse(body.kind);
  const attachment = attachmentsOf(body.attachment ? [body.attachment] : [])[0];
  const replyPostId = textOf(body.replyPostId);
  return {
    id: row.id,
    profileId: row.profileId,
    eventPostId: row.eventPostId,
    status: status.data,
    ...(kind.success ? { kind: kind.data } : {}),
    createdAt: normalizeIsoDatetime(row.createdAt),
    ...(replyPostId ? { replyPostId } : {}),
    ...(attachment ? { attachment } : {}),
    data: omit(body, ['egressId', 'destinationHost']),
  };
};

const byCreatedAt = <T extends { createdAt: string }>(rows: T[]) =>
  [...rows].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

const stringList = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];

const actorOf = (row: OwnedProfileRow) => {
  const actor = {
    ...(textOf(row.domain) ? { domain: textOf(row.domain) } : {}),
    ...(textOf(row.uri) ? { uri: textOf(row.uri) } : {}),
    ...(textOf(row.inboxUrl) ? { inboxUrl: textOf(row.inboxUrl) } : {}),
    ...(textOf(row.sharedInboxUrl)
      ? { sharedInboxUrl: textOf(row.sharedInboxUrl) }
      : {}),
    ...(textOf(row.publicKeyPem)
      ? { publicKeyPem: textOf(row.publicKeyPem) }
      : {}),
    ...(textOf(row.privateKeyPem)
      ? { privateKeyPem: textOf(row.privateKeyPem) }
      : {}),
    ...(textOf(row.keyId) ? { keyId: textOf(row.keyId) } : {}),
  };
  return actor;
};

const ownedProfiles = (rows: ContentExportRows) =>
  rows.profiles.map((row) => {
    const settings = rows.settings.find(
      (item) => item.profileId === row.id,
    )?.body;
    return {
      id: row.id,
      handle: row.handle,
      type: row.type,
      createdAt: normalizeIsoDatetime(row.createdAt),
      updatedAt: normalizeIsoDatetime(row.updatedAt),
      ...(row.deletedAt
        ? { deletedAt: normalizeIsoDatetime(row.deletedAt) }
        : {}),
      data: copyObject(row.body),
      actor: actorOf(row),
      ...(settings ? { settings: copyObject(settings) } : {}),
      roles: rows.roles
        .filter((role) => role.profileId === row.id)
        .map((role) => {
          const displayName = textOf(recordOf(role.body)?.displayName);
          return {
            id: role.id,
            key: role.key,
            ...(displayName ? { displayName } : {}),
          };
        }),
      memberships: rows.memberships
        .filter((membership) => membership.profileId === row.id)
        .map((membership) => {
          const displayName = textOf(recordOf(membership.body)?.displayName);
          return {
            groupId: membership.groupId,
            handle: membership.handle,
            ...(displayName ? { displayName } : {}),
            roles: stringList(recordOf(membership.edgeBody)?.roles),
            since: normalizeIsoDatetime(membership.since),
          };
        }),
      followedHashtags: rows.followedHashtags
        .filter((tag) => tag.profileId === row.id)
        .map((tag) => tag.name),
    };
  });

const activityLog = (rows: ContentEntryRow[]) =>
  rows.flatMap((row) => {
    if (!row.id) return [];
    const type = entryType(row.body);
    if (!type) return [];
    const data = recordOf(recordOf(row.body)?.data);
    return [
      {
        id: row.id,
        postId: row.postId,
        type,
        createdAt: normalizeIsoDatetime(row.createdAt),
        ...(data ? { data } : {}),
      },
    ];
  });

/** Shape stored rows into the member's download. */
export const assembleAccountContent = (
  rows: ContentExportRows,
): AccountContentExport => {
  const authored = rows.posts.flatMap((row) => {
    const post = postFromRow(row);
    return post ? [post] : [];
  });
  const linkedPost = (row: ContentBookmarkRow) => {
    const post = row.post ? postFromRow(row.post) : undefined;
    return {
      postId: row.postId,
      createdAt: normalizeIsoDatetime(row.createdAt),
      ...(post ? { post } : {}),
    };
  };
  return accountContentExportSchema.parse({
    profiles: ownedProfiles(rows),
    posts: authored.filter((post) => post.type !== 'event'),
    events: authored.filter((post) => post.type === 'event'),
    followers: earliestProfiles(rows.followers),
    following: earliestProfiles(rows.following),
    followRequests: rows.followRequests.map((row) => ({
      direction: row.direction,
      profile: profileRef(row),
    })),
    blocks: earliestProfiles(rows.blocks),
    bookmarks: byCreatedAt(rows.bookmarks.map(linkedPost)),
    favorites: byCreatedAt(activeFavorites(rows.entries)),
    entries: byCreatedAt(activityLog(rows.entries)),
    reposts: byCreatedAt(
      rows.reposts.map((row) => ({
        postId: row.postId,
        repostOfId: row.repostOfId,
        createdAt: normalizeIsoDatetime(row.createdAt),
      })),
    ),
    mentions: byCreatedAt(
      rows.mentions.map((row) => {
        const text = textOf(recordOf(row.body)?.text);
        return {
          postId: row.postId,
          createdAt: normalizeIsoDatetime(row.createdAt),
          ...(text ? { text } : {}),
        };
      }),
    ),
    directMessages: byCreatedAt(rows.directMessages.map(linkedPost)),
    seenPosts: [...rows.seenPosts]
      .map((row) => ({
        postId: row.postId,
        seenAt: normalizeIsoDatetime(row.seenAt),
      }))
      .sort((a, b) => (a.seenAt < b.seenAt ? -1 : 1)),
    notifications: byCreatedAt(
      rows.notifications.map((row) => ({
        id: row.id,
        profileId: row.profileId,
        createdAt: normalizeIsoDatetime(row.createdAt),
        updatedAt: normalizeIsoDatetime(row.updatedAt),
        ...(row.deletedAt
          ? { deletedAt: normalizeIsoDatetime(row.deletedAt) }
          : {}),
        data: copyObject(row.body),
      })),
    ),
    reports: byCreatedAt(
      rows.reports.map((row) => ({
        id: row.id,
        createdAt: normalizeIsoDatetime(row.createdAt),
        data: copyObject(row.body),
      })),
    ),
    accessTokens: byCreatedAt(
      rows.accessTokens.flatMap((row) => {
        const body = omit(row.body, ['signedToken']);
        const name = textOf(body.name);
        if (!name) return [];
        const description = textOf(body.description);
        const expiresAt = textOf(body.expiresAt);
        const revokedAt = textOf(body.revokedAt);
        return [
          {
            id: row.id,
            name,
            ...(description ? { description } : {}),
            createdAt: normalizeIsoDatetime(row.createdAt),
            updatedAt: normalizeIsoDatetime(row.updatedAt),
            ...(expiresAt ? { expiresAt } : {}),
            ...(revokedAt ? { revokedAt } : {}),
          },
        ];
      }),
    ),
    pushSubscriptions: byCreatedAt(
      rows.pushSubscriptions.flatMap((row) => {
        const body = omit(row.body, [
          'keys',
          'apnToken',
          'fcmToken',
          'endpoint',
        ]);
        const type = textOf(body.type);
        if (!type) return [];
        const deviceName = textOf(body.deviceName);
        const url = textOf(body.url);
        const alerts = recordOf(body.alerts);
        return [
          {
            id: row.id,
            type,
            ...(deviceName ? { deviceName } : {}),
            createdAt: normalizeIsoDatetime(row.createdAt),
            ...(alerts ? { alerts } : {}),
            ...(url ? { url } : {}),
          },
        ];
      }),
    ),
    invites: byCreatedAt(
      rows.invites.map((row) => {
        const active = recordOf(row.body)?.active;
        return {
          id: row.id,
          slug: row.slug,
          relationship: row.relationship,
          createdAt: normalizeIsoDatetime(row.createdAt),
          ...(typeof active === 'boolean' ? { active } : {}),
        };
      }),
    ),
    jamRecordings: byCreatedAt(
      rows.jamRecordings.flatMap((row) => {
        const recording = recordingFromRow(row);
        return recording ? [recording] : [];
      }),
    ),
    jamActivity: byCreatedAt(
      rows.jamActivity.flatMap((row) => {
        const body = recordOf(row.body) ?? {};
        const type = textOf(body.type);
        if (!type) return [];
        const content = textOf(body.content);
        const reaction = textOf(body.reaction);
        return [
          {
            id: row.id,
            jamId: row.jamId,
            type,
            createdAt: normalizeIsoDatetime(row.createdAt),
            ...(content ? { content } : {}),
            ...(reaction ? { reaction } : {}),
          },
        ];
      }),
    ),
    rsvps: byCreatedAt(currentRsvps(rows.entries)),
  });
};

const emptyRows = (): ContentExportRows => ({
  profiles: [],
  settings: [],
  roles: [],
  memberships: [],
  followedHashtags: [],
  posts: [],
  followers: [],
  following: [],
  followRequests: [],
  blocks: [],
  bookmarks: [],
  entries: [],
  reposts: [],
  mentions: [],
  directMessages: [],
  seenPosts: [],
  notifications: [],
  reports: [],
  accessTokens: [],
  pushSubscriptions: [],
  invites: [],
  jamRecordings: [],
  jamActivity: [],
});

const postSnapshot = (
  postId: string | null,
  deletedAt: string | null,
  row: {
    creatorId: string | null;
    type: string | null;
    visibility: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    body: unknown;
    authorId: string | null;
    authorHandle: string | null;
    authorBody: unknown;
  },
): ContentPostRow | null => {
  if (
    !postId ||
    !row.creatorId ||
    !row.type ||
    !row.visibility ||
    !row.createdAt ||
    !row.updatedAt
  ) {
    return null;
  }
  return {
    id: postId,
    profileId: row.creatorId,
    type: row.type,
    visibility: row.visibility,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deletedAt,
    body: row.body,
    author:
      row.authorId && row.authorHandle
        ? { id: row.authorId, handle: row.authorHandle, body: row.authorBody }
        : null,
  };
};

const profileTextId = sql`${profiles.id}::text`;

const loadRows = async (input: {
  accountId: string;
  profileIds: string[];
}): Promise<ContentExportRows> => {
  const { accountId, profileIds } = input;
  if (profileIds.length === 0) {
    return {
      ...emptyRows(),
      pushSubscriptions: accountId
        ? await loadPushSubscriptions(accountId)
        : [],
    };
  }
  const db = await database();
  const [
    profileRows,
    settingRows,
    roleRows,
    membershipRows,
    hashtagRows,
    postRows,
    followerRows,
    followingRows,
    sentRequestRows,
    receivedRequestRows,
    blockRows,
    bookmarkRows,
    entryRows,
    repostRows,
    mentionRows,
    directRows,
    seenRows,
    notificationRows,
    reportRows,
    tokenRows,
    pushRows,
    createdInviteRows,
    redeemedInviteRows,
    recordingRows,
    jamRows,
  ] = await Promise.all([
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        type: profiles.type,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
        deletedAt: profiles.deletedAt,
        body: profiles.body,
        domain: profiles.activityPubDomain,
        uri: profiles.uri,
        inboxUrl: profiles.inboxUrl,
        sharedInboxUrl: profiles.sharedInboxUrl,
        publicKeyPem: profiles.publicKeyPem,
        privateKeyPem: profiles.privateKeyPem,
        keyId: profiles.keyId,
      })
      .from(profiles)
      .where(inArray(profiles.id, profileIds)),
    db
      .select({
        profileId: profileSettings.profileId,
        body: profileSettings.body,
      })
      .from(profileSettings)
      .where(inArray(profileSettings.profileId, profileIds)),
    db
      .select({
        profileId: hasRole.fromId,
        id: roles.id,
        key: roles.key,
        body: roles.body,
      })
      .from(hasRole)
      .innerJoin(roles, eq(hasRole.toId, sql`${roles.id}::text`))
      .where(inArray(hasRole.fromId, profileIds)),
    db
      .select({
        profileId: userGroups.fromId,
        groupId: groups.id,
        handle: groups.handle,
        body: groups.body,
        edgeBody: userGroups.body,
        since: userGroups.createdAt,
      })
      .from(userGroups)
      .innerJoin(groups, eq(userGroups.toId, sql`${groups.id}::text`))
      .where(inArray(userGroups.fromId, profileIds)),
    db
      .select({
        profileId: profileHashtags.fromId,
        name: hashtags.name,
      })
      .from(profileHashtags)
      .innerJoin(hashtags, eq(profileHashtags.toId, sql`${hashtags.id}::text`))
      .where(inArray(profileHashtags.fromId, profileIds)),
    db
      .select({
        id: posts.id,
        profileId: posts.creatorId,
        type: posts.type,
        visibility: posts.visibility,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,
        deletedAt: posts.deletedAt,
        body: posts.body,
        inReplyToId: replyTo.toId,
        repostOfId: repost.toId,
        groupId: postGroups.toId,
      })
      .from(posts)
      .leftJoin(replyTo, eq(replyTo.fromId, sql`${posts.id}::text`))
      .leftJoin(repost, eq(repost.fromId, sql`${posts.id}::text`))
      .leftJoin(postGroups, eq(postGroups.fromId, sql`${posts.id}::text`))
      .where(inArray(posts.creatorId, profileIds))
      .orderBy(asc(posts.createdAt), asc(posts.id)),
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        body: profiles.body,
        since: follows.createdAt,
      })
      .from(follows)
      .innerJoin(profiles, eq(follows.fromId, profileTextId))
      .where(inArray(follows.toId, profileIds))
      .orderBy(asc(follows.createdAt)),
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        body: profiles.body,
        since: follows.createdAt,
      })
      .from(follows)
      .innerJoin(profiles, eq(follows.toId, profileTextId))
      .where(inArray(follows.fromId, profileIds))
      .orderBy(asc(follows.createdAt)),
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        body: profiles.body,
        since: requestsFollow.createdAt,
      })
      .from(requestsFollow)
      .innerJoin(profiles, eq(requestsFollow.toId, profileTextId))
      .where(inArray(requestsFollow.fromId, profileIds)),
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        body: profiles.body,
        since: requestsFollow.createdAt,
      })
      .from(requestsFollow)
      .innerJoin(profiles, eq(requestsFollow.fromId, profileTextId))
      .where(inArray(requestsFollow.toId, profileIds)),
    db
      .select({
        id: profiles.id,
        handle: profiles.handle,
        body: profiles.body,
        since: blocks.createdAt,
      })
      .from(blocks)
      .innerJoin(profiles, eq(blocks.toId, profileTextId))
      .where(inArray(blocks.fromId, profileIds)),
    db
      .select({
        postId: bookmarks.toId,
        createdAt: bookmarks.createdAt,
        deletedAt: posts.deletedAt,
        creatorId: posts.creatorId,
        type: posts.type,
        visibility: posts.visibility,
        postCreatedAt: posts.createdAt,
        postUpdatedAt: posts.updatedAt,
        body: posts.body,
        authorId: profiles.id,
        authorHandle: profiles.handle,
        authorBody: profiles.body,
      })
      .from(bookmarks)
      .leftJoin(posts, eq(bookmarks.toId, sql`${posts.id}::text`))
      .leftJoin(profiles, eq(posts.creatorId, profileTextId))
      .where(inArray(bookmarks.fromId, profileIds))
      .orderBy(asc(bookmarks.createdAt)),
    db
      .select({
        id: entries.id,
        postId: entries.toId,
        createdAt: entries.createdAt,
        body: entries.body,
        deletedAt: posts.deletedAt,
        creatorId: posts.creatorId,
        type: posts.type,
        visibility: posts.visibility,
        postCreatedAt: posts.createdAt,
        postUpdatedAt: posts.updatedAt,
        postBody: posts.body,
        authorId: profiles.id,
        authorHandle: profiles.handle,
        authorBody: profiles.body,
      })
      .from(entries)
      .leftJoin(posts, eq(entries.toId, sql`${posts.id}::text`))
      .leftJoin(profiles, eq(posts.creatorId, profileTextId))
      .where(inArray(entries.fromId, profileIds))
      .orderBy(asc(entries.createdAt)),
    db
      .select({
        postId: repost.fromId,
        repostOfId: repost.toId,
        createdAt: repost.createdAt,
      })
      .from(repost)
      .innerJoin(posts, eq(repost.fromId, sql`${posts.id}::text`))
      .where(inArray(posts.creatorId, profileIds)),
    db
      .select({
        postId: mentions.fromId,
        createdAt: mentions.createdAt,
        body: mentions.body,
      })
      .from(mentions)
      .where(inArray(mentions.toId, profileIds)),
    db
      .select({
        postId: audience.fromId,
        createdAt: audience.createdAt,
        deletedAt: posts.deletedAt,
        creatorId: posts.creatorId,
        type: posts.type,
        visibility: posts.visibility,
        postCreatedAt: posts.createdAt,
        postUpdatedAt: posts.updatedAt,
        body: posts.body,
        authorId: profiles.id,
        authorHandle: profiles.handle,
        authorBody: profiles.body,
      })
      .from(audience)
      .innerJoin(posts, eq(audience.fromId, sql`${posts.id}::text`))
      .leftJoin(profiles, eq(posts.creatorId, profileTextId))
      .where(
        and(
          inArray(audience.toId, profileIds),
          not(inArray(posts.creatorId, profileIds)),
        ),
      ),
    db
      .select({
        postId: postSeen.toId,
        seenAt: postSeen.createdAt,
      })
      .from(postSeen)
      .where(inArray(postSeen.fromId, profileIds)),
    db
      .select({
        id: notifications.id,
        profileId: notifications.profileId,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
        deletedAt: notifications.deletedAt,
        body: notifications.body,
      })
      .from(notifications)
      .where(inArray(notifications.profileId, profileIds)),
    db
      .select({
        id: reports.id,
        createdAt: reports.createdAt,
        body: reports.body,
      })
      .from(createdReport)
      .innerJoin(reports, eq(createdReport.toId, sql`${reports.id}::text`))
      .where(inArray(createdReport.fromId, profileIds)),
    db
      .select({
        id: accessTokens.id,
        createdAt: accessTokens.createdAt,
        updatedAt: accessTokens.updatedAt,
        body: accessTokens.body,
      })
      .from(profileAccessTokens)
      .innerJoin(
        accessTokens,
        eq(profileAccessTokens.toId, sql`${accessTokens.id}::text`),
      )
      .where(inArray(profileAccessTokens.fromId, profileIds)),
    loadPushSubscriptions(accountId),
    db
      .select({
        id: inviteLinks.id,
        slug: inviteLinks.slug,
        createdAt: inviteLinkCreators.createdAt,
        body: inviteLinks.body,
      })
      .from(inviteLinkCreators)
      .innerJoin(
        inviteLinks,
        eq(inviteLinkCreators.fromId, sql`${inviteLinks.id}::text`),
      )
      .where(inArray(inviteLinkCreators.toId, profileIds)),
    db
      .select({
        id: inviteLinks.id,
        slug: inviteLinks.slug,
        createdAt: inviteLinkRedeemers.createdAt,
        body: inviteLinks.body,
      })
      .from(inviteLinkRedeemers)
      .innerJoin(
        inviteLinks,
        eq(inviteLinkRedeemers.fromId, sql`${inviteLinks.id}::text`),
      )
      .where(inArray(inviteLinkRedeemers.toId, profileIds)),
    db
      .select({
        id: jamRecordings.id,
        profileId: jamRecordings.fromId,
        eventPostId: jamRecordings.toId,
        createdAt: jamRecordings.createdAt,
        body: jamRecordings.body,
      })
      .from(jamRecordings)
      .leftJoin(posts, eq(jamRecordings.toId, sql`${posts.id}::text`))
      // Recordings the member started, plus recordings on events they created.
      .where(
        or(
          inArray(jamRecordings.fromId, profileIds),
          and(
            inArray(posts.creatorId, profileIds),
            eq(posts.type, 'event'),
            isNull(posts.deletedAt),
          ),
        ),
      )
      .orderBy(asc(jamRecordings.createdAt)),
    db
      .select({
        id: jamEvents.id,
        jamId: jamEvents.postId,
        createdAt: jamEvents.createdAt,
        body: jamEvents.body,
      })
      .from(jamEvents)
      .where(
        sql`${jamEvents.body}->>'profileId' in (${sql.join(
          profileIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      ),
  ]);

  const postsById = new Map<string, ContentPostRow>();
  for (const row of postRows) {
    const current = postsById.get(row.id);
    const next: ContentPostRow = {
      id: row.id,
      profileId: row.profileId,
      type: row.type,
      visibility: row.visibility,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      body: row.body,
      inReplyToId: row.inReplyToId,
      repostOfId: row.repostOfId,
      groupId: row.groupId,
    };
    if (!current) {
      postsById.set(row.id, next);
      continue;
    }
    postsById.set(row.id, {
      ...current,
      inReplyToId: current.inReplyToId ?? next.inReplyToId,
      repostOfId: current.repostOfId ?? next.repostOfId,
      groupId: current.groupId ?? next.groupId,
    });
  }

  const linked = (row: {
    postId: string;
    createdAt: string;
    deletedAt: string | null;
    creatorId: string | null;
    type: string | null;
    visibility: string | null;
    postCreatedAt: string | null;
    postUpdatedAt: string | null;
    body: unknown;
    authorId: string | null;
    authorHandle: string | null;
    authorBody: unknown;
  }): ContentBookmarkRow => ({
    postId: row.postId,
    createdAt: row.createdAt,
    post: postSnapshot(row.postId, row.deletedAt, {
      creatorId: row.creatorId,
      type: row.type,
      visibility: row.visibility,
      createdAt: row.postCreatedAt,
      updatedAt: row.postUpdatedAt,
      body: row.body,
      authorId: row.authorId,
      authorHandle: row.authorHandle,
      authorBody: row.authorBody,
    }),
  });

  return {
    profiles: profileRows,
    settings: settingRows,
    roles: roleRows,
    memberships: membershipRows,
    followedHashtags: hashtagRows,
    posts: [...postsById.values()],
    followers: followerRows,
    following: followingRows,
    followRequests: [
      ...sentRequestRows.map((row) => ({ ...row, direction: 'sent' as const })),
      ...receivedRequestRows.map((row) => ({
        ...row,
        direction: 'received' as const,
      })),
    ],
    blocks: blockRows,
    bookmarks: bookmarkRows.map(linked),
    entries: entryRows.map((row) => ({
      id: row.id,
      postId: row.postId,
      createdAt: row.createdAt,
      body: row.body,
      post: postSnapshot(row.postId, row.deletedAt, {
        creatorId: row.creatorId,
        type: row.type,
        visibility: row.visibility,
        createdAt: row.postCreatedAt,
        updatedAt: row.postUpdatedAt,
        body: row.postBody,
        authorId: row.authorId,
        authorHandle: row.authorHandle,
        authorBody: row.authorBody,
      }),
    })),
    reposts: repostRows,
    mentions: mentionRows,
    directMessages: directRows.map(linked),
    seenPosts: seenRows,
    notifications: notificationRows,
    reports: reportRows,
    accessTokens: tokenRows,
    pushSubscriptions: pushRows,
    invites: [
      ...createdInviteRows.map((row) => ({
        ...row,
        relationship: 'created' as const,
      })),
      ...redeemedInviteRows.map((row) => ({
        ...row,
        relationship: 'redeemed' as const,
      })),
    ],
    jamRecordings: recordingRows,
    jamActivity: jamRows,
  };
};

const loadPushSubscriptions = async (accountId: string) => {
  if (!accountId) return [];
  const db = await database();
  return db
    .select({
      id: pushSubscriptions.id,
      createdAt: pushSubscriptions.createdAt,
      body: pushSubscriptions.body,
    })
    .from(accountToPushSubscription)
    .innerJoin(
      pushSubscriptions,
      eq(accountToPushSubscription.toId, sql`${pushSubscriptions.id}::text`),
    )
    .where(eq(accountToPushSubscription.fromId, accountId));
};

/** Everything stored on the member's profiles, plus the account's devices. */
export const exportAccountContent = async (input: {
  accountId: string;
  profileIds: string[];
}): Promise<AccountContentExport> =>
  assembleAccountContent(await loadRows(input));
