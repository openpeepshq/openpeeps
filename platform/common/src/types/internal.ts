import { z } from 'zod';
import {
  Account,
  accountSchema,
  baseSchemaShape,
  Profile,
  ProfileStats,
  profileStatsSchema,
  Role,
  profileDataSchema,
  idSchemaShape,
  roleSchema,
  profileSchema,
  groupDataSchema,
  modelSchema,
  groupRoleSchema,
  mentionDataSchema,
  reactionDataSchema,
  answerSchema,
  rsvpSchema,
  postDataUnionSchema,
  postTypeSchema,
  visibilityTypeSchema,
  applicationDataSchema,
  hashtagSchema,
  accountInteractionsSchema,
  GroupRoleData,
  inviteLinkSchema,
  InviteLink,
  Model,
  reportSchema,
  ProfileData,
  Report,
  groupSchema,
  Group,
  jamRecordingSchema,
  JamRecording,
  accessTokenSchema,
  AccessToken,
  scopeSchema,
  Scope,
} from './models';
import { jsonSchema } from './utils';

export const groupWithMetaSchema = groupDataSchema.extend({
  ...baseSchemaShape,
  ...idSchemaShape,
  membersCount: z.number(),
  lastPostAt: z.string().datetime().nullable().optional(),
});

export const membershipSchema = groupRoleSchema.extend({
  group: modelSchema(groupWithMetaSchema),
});

export type Membership = z.infer<typeof membershipSchema>;

export type GroupWithMeta = z.infer<typeof groupWithMetaSchema>;
export type GroupWithMetaInput = z.input<typeof groupWithMetaSchema>;

export const profileWithMetaSchema = profileDataSchema.extend({
  ...baseSchemaShape,
  ...idSchemaShape,
  roles: roleSchema.array(),
  followers: profileSchema.array(),
  following: profileSchema.array(),
  controllers: accountSchema.array(),
  memberships: membershipSchema.array(),
  profileStats: profileStatsSchema,
});

export type ProfileWithMeta = Model<ProfileData> & {
  roles: Role[];
  followers: Profile[];
  following: Profile[];
  controllers: Account[];
  memberships: Membership[];
  profileStats: ProfileStats;
};

export const accessTokenWithMetaSchema = accessTokenSchema.extend({
  profile: profileWithMetaSchema,
  scopes: z.array(scopeSchema).optional(),
});
export type AccessTokenWithMeta = AccessToken & {
  ownedBy?: ProfileWithMeta;
  scopes?: Scope[];
};

export const mentionWithProfileSchema = mentionDataSchema.extend({
  profile: profileWithMetaSchema,
});
export type MentionWithProfile = z.infer<typeof mentionWithProfileSchema>;

const reactionWithProfileSchema = reactionDataSchema.extend({
  profile: profileWithMetaSchema,
});
export type ReactionProfile = z.infer<typeof reactionWithProfileSchema>;

const _answerWithProfileSchema = answerSchema.extend({
  profile: profileWithMetaSchema,
});
export type AnswerWithProfile = z.infer<typeof _answerWithProfileSchema>;

const rsvpWithMetaSchema = rsvpSchema.extend({
  profile: profileWithMetaSchema,
  createdAt: z.string().datetime(),
});
export type RSVPWithMeta = z.infer<typeof rsvpWithMetaSchema>;

export const entryWithProfileSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create'),
    data: postDataUnionSchema,
    profile: profileWithMetaSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('edit'),
    data: postDataUnionSchema,
    profile: profileWithMetaSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('delete'),
    data: z.any(),
    profile: profileWithMetaSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('answer'),
    data: answerSchema,
    profile: profileWithMetaSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('rsvp'),
    data: rsvpSchema,
    profile: profileWithMetaSchema,
    createdAt: z.string().datetime(),
  }),
]);

export type EntryWithProfile = z.infer<typeof entryWithProfileSchema>;

export const replyPostSchema = z.object({
  id: z.string(),
  type: postTypeSchema,
  profile: profileWithMetaSchema,
  data: postDataUnionSchema,
  creatorId: z.string(),
  entries: entryWithProfileSchema.array(),
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional().nullable(),
  visibility: visibilityTypeSchema,
  group: groupWithMetaSchema.optional().nullable(),
  audience: z.array(profileWithMetaSchema).optional().nullable(),
});
export type ReplyPost = z.infer<typeof replyPostSchema>;

const basePostSchema = replyPostSchema.extend({
  repostCount: z.number(),
  replyCount: z.number(),
  reactions: reactionWithProfileSchema.array(),
  application: applicationDataSchema.optional(),
  mentions: z.array(mentionWithProfileSchema),
  tags: z.array(hashtagSchema),
  groupId: z.string().optional().nullable(),
  groupDiscoverable: z.boolean().optional().nullable(),
  updatedAt: z.string().datetime(),
  accountInteractions: accountInteractionsSchema.optional(),
  rsvps: rsvpWithMetaSchema.array(),
  seen: z.boolean().optional(),
});
export type BasePost = z.infer<typeof basePostSchema>;

const withReplyPostSchema = basePostSchema.extend({
  inReplyToId: z.string().optional().nullable(),
  replyTo: replyPostSchema.optional().nullable(),
});

export const postWithMetaSchema = withReplyPostSchema
  .extend({
    repost: basePostSchema.optional().nullable(),
  })
  .openapi('Post');

export type PostWithMetaInput = z.input<typeof postWithMetaSchema>;
export type PostWithMeta = BasePost & {
  inReplyToId?: string | null;
  replyTo?: ReplyPost | null;
  repost?: BasePost | null;
};

export interface ExpandedNotification {
  id: string;
  profileId: string;
  pushHandled?: boolean;
  emailHandled?: boolean;
  type: string;
  seen?: boolean;
  read?: boolean;
  createdAt: string;
  updatedAt: string;
  recipientProfile: z.infer<typeof profileWithMetaSchema>;
  senderProfile?: z.infer<typeof profileWithMetaSchema> | null;
  group?: Group | null;
  post?: PostWithMeta | null;
  data?: unknown;
};

export const expandedNotificationSchema = z.object({
  id: z.string().uuid(),
  profileId: z.string().uuid(),
  pushHandled: z.boolean().optional(),
  emailHandled: z.boolean().optional(),
  type: z.string(),
  seen: z.boolean().optional(),
  read: z.boolean().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  recipientProfile: profileWithMetaSchema,
  senderProfile: profileWithMetaSchema.nullable().optional(),
  group: groupSchema.nullable().optional(),
  post: postWithMetaSchema.nullable().optional(),
  data: jsonSchema.optional(),
});


export const groupMemberSchema = groupRoleSchema.extend({
  profile: profileWithMetaSchema,
});

export interface GroupMember extends GroupRoleData {
  profile: ProfileWithMeta;
}

export const inviteLinkWithMetaSchema = inviteLinkSchema.extend({
  profile: profileWithMetaSchema,
  redemptions: profileWithMetaSchema.array(),
});

export interface InviteLinkWithMeta extends InviteLink {
  profile: ProfileWithMeta;
  redemptions: ProfileWithMeta[];
}

export interface PostContext {
  ancestors: PostWithMetaInput[];
  descendants: PostWithMetaInput[];
}

export const postContextSchema: z.ZodType<PostContext> = z.object({
  ancestors: postWithMetaSchema.array(),
  descendants: postWithMetaSchema.array(),
});

export const reportWithMetaSchema = reportSchema.extend({
  reporterProfile: profileWithMetaSchema,
  reportedProfile: profileWithMetaSchema,
  reportedPosts: z.array(postWithMetaSchema),
});
export type ReportWithMeta = Report & {
  reporterProfile: ProfileWithMeta;
  reportedProfile: ProfileWithMeta;
  reportedPosts: PostWithMeta[];
};

export const jamRecordingWithMetaSchema = jamRecordingSchema.extend({
  profile: profileWithMetaSchema,
  post: postWithMetaSchema
});

export type JamRecordingWithMeta = JamRecording & {
  profile: ProfileWithMeta;
  post: PostWithMeta;
};