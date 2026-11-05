import { z } from 'zod';
import { publicAccountSchema } from './api';
import {
  jamRecordingKindSchema,
  jamRecordingStatusSchema,
  postTypeSchema,
  rsvpResponseSchema,
  visibilityTypeSchema,
} from './models';

/** Stored JSON copied into the download without dropping unknown fields. */
const storedObjectSchema = z.record(z.string(), z.unknown());

/** File attached to a post or jam recording in an account export. */
export const exportedAttachmentSchema = z.object({
  type: z.string(),
  url: z.string(),
  filename: z.string(),
});
export type ExportedAttachment = z.infer<typeof exportedAttachmentSchema>;

/** Another member, identified without their private account data. */
export const exportedProfileRefSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  displayName: z.string().optional(),
  avatar: z.string().optional(),
  since: z.iso.datetime(),
});
export type ExportedProfileRef = z.infer<typeof exportedProfileRefSchema>;

/** A post or event the member wrote, or a snapshot of one they saved. */
export const exportedPostSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  type: postTypeSchema,
  visibility: visibilityTypeSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  content: z.string().optional(),
  title: z.string().optional(),
  name: z.string().optional(),
  start: z.string().optional(),
  end: z.string().optional(),
  wholeDay: z.boolean().optional(),
  location: z.string().optional(),
  url: z.string().optional(),
  jam: z.boolean().optional(),
  inReplyToId: z.string().optional(),
  repostOfId: z.string().optional(),
  groupId: z.string().optional(),
  deletedAt: z.iso.datetime().optional(),
  /** Full stored post document, including fields not listed above. */
  data: storedObjectSchema,
  author: z
    .object({
      id: z.uuid(),
      handle: z.string(),
      displayName: z.string().optional(),
    })
    .optional(),
  attachments: exportedAttachmentSchema.array(),
});
export type ExportedPost = z.infer<typeof exportedPostSchema>;

export const exportedBookmarkSchema = z.object({
  postId: z.uuid(),
  createdAt: z.iso.datetime(),
  post: exportedPostSchema.optional(),
});
export type ExportedBookmark = z.infer<typeof exportedBookmarkSchema>;

export const exportedFavoriteSchema = z.object({
  postId: z.uuid(),
  reaction: z.string(),
  createdAt: z.iso.datetime(),
  post: exportedPostSchema.optional(),
});
export type ExportedFavorite = z.infer<typeof exportedFavoriteSchema>;

export const exportedJamRecordingSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  eventPostId: z.uuid(),
  status: jamRecordingStatusSchema,
  kind: jamRecordingKindSchema.optional(),
  createdAt: z.iso.datetime(),
  replyPostId: z.string().optional(),
  attachment: exportedAttachmentSchema.optional(),
  /** Recording document without LiveKit egress ids or stream hosts. */
  data: storedObjectSchema,
});
export type ExportedJamRecording = z.infer<typeof exportedJamRecordingSchema>;

export const exportedRsvpSchema = z.object({
  eventPostId: z.uuid(),
  response: rsvpResponseSchema,
  recurrenceId: z.string().optional(),
  createdAt: z.iso.datetime(),
  event: exportedPostSchema.optional(),
});
export type ExportedRsvp = z.infer<typeof exportedRsvpSchema>;

/** The member's own profile, including fields that stay off the public profile. */
export const exportedOwnedProfileSchema = z.object({
  id: z.uuid(),
  handle: z.string(),
  type: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().optional(),
  data: storedObjectSchema,
  actor: z.object({
    domain: z.string().optional(),
    uri: z.string().optional(),
    inboxUrl: z.string().optional(),
    sharedInboxUrl: z.string().optional(),
    publicKeyPem: z.string().optional(),
    privateKeyPem: z.string().optional(),
    keyId: z.string().optional(),
  }),
  settings: storedObjectSchema.optional(),
  roles: z.array(
    z.object({
      id: z.uuid(),
      key: z.string(),
      displayName: z.string().optional(),
    }),
  ),
  memberships: z.array(
    z.object({
      groupId: z.uuid(),
      handle: z.string(),
      displayName: z.string().optional(),
      roles: z.array(z.string()),
      since: z.iso.datetime(),
    }),
  ),
  followedHashtags: z.array(z.string()),
});
export type ExportedOwnedProfile = z.infer<typeof exportedOwnedProfileSchema>;

export const exportedFollowRequestSchema = z.object({
  direction: z.enum(['sent', 'received']),
  profile: exportedProfileRefSchema,
});

export const exportedNotificationSchema = z.object({
  id: z.uuid(),
  profileId: z.uuid(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().optional(),
  data: storedObjectSchema,
});

export const exportedEntrySchema = z.object({
  id: z.uuid(),
  postId: z.uuid(),
  type: z.string(),
  createdAt: z.iso.datetime(),
  data: storedObjectSchema.optional(),
});

export const exportedRepostSchema = z.object({
  postId: z.uuid(),
  repostOfId: z.uuid(),
  createdAt: z.iso.datetime(),
});

export const exportedMentionSchema = z.object({
  postId: z.uuid(),
  createdAt: z.iso.datetime(),
  text: z.string().optional(),
});

export const exportedDirectMessageSchema = z.object({
  postId: z.uuid(),
  createdAt: z.iso.datetime(),
  post: exportedPostSchema.optional(),
});

export const exportedSeenPostSchema = z.object({
  postId: z.uuid(),
  seenAt: z.iso.datetime(),
});

export const exportedReportSchema = z.object({
  id: z.uuid(),
  createdAt: z.iso.datetime(),
  data: storedObjectSchema,
});

export const exportedAccessTokenSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  description: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  expiresAt: z.string().optional(),
  revokedAt: z.string().optional(),
});

export const exportedPushSubscriptionSchema = z.object({
  id: z.uuid(),
  type: z.string(),
  deviceName: z.string().optional(),
  createdAt: z.iso.datetime(),
  alerts: storedObjectSchema.optional(),
  url: z.string().optional(),
});

export const exportedInviteSchema = z.object({
  id: z.uuid(),
  slug: z.string(),
  relationship: z.enum(['created', 'redeemed']),
  createdAt: z.iso.datetime(),
  active: z.boolean().optional(),
});

export const exportedJamActivitySchema = z.object({
  id: z.uuid(),
  jamId: z.string(),
  type: z.string(),
  createdAt: z.iso.datetime(),
  content: z.string().optional(),
  reaction: z.string().optional(),
});

/** Everything stored for the member's profiles. */
export const accountContentExportSchema = z.object({
  profiles: exportedOwnedProfileSchema.array(),
  posts: exportedPostSchema.array(),
  events: exportedPostSchema.array(),
  followers: exportedProfileRefSchema.array(),
  following: exportedProfileRefSchema.array(),
  followRequests: exportedFollowRequestSchema.array(),
  blocks: exportedProfileRefSchema.array(),
  bookmarks: exportedBookmarkSchema.array(),
  favorites: exportedFavoriteSchema.array(),
  entries: exportedEntrySchema.array(),
  reposts: exportedRepostSchema.array(),
  mentions: exportedMentionSchema.array(),
  directMessages: exportedDirectMessageSchema.array(),
  seenPosts: exportedSeenPostSchema.array(),
  notifications: exportedNotificationSchema.array(),
  reports: exportedReportSchema.array(),
  accessTokens: exportedAccessTokenSchema.array(),
  pushSubscriptions: exportedPushSubscriptionSchema.array(),
  invites: exportedInviteSchema.array(),
  jamRecordings: exportedJamRecordingSchema.array(),
  jamActivity: exportedJamActivitySchema.array(),
  rsvps: exportedRsvpSchema.array(),
});
export type AccountContentExport = z.infer<typeof accountContentExportSchema>;

/** Data a user can download as their account export. */
export const accountExportSchema = accountContentExportSchema.extend({
  exportedAt: z.iso.datetime(),
  account: publicAccountSchema,
});

export type AccountExport = z.infer<typeof accountExportSchema>;
