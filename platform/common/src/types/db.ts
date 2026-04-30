import { z } from "zod";
import { answerSchema, Entry, Group, Hashtag, hashtagSchema, MentionData, mentionDataSchema, Notification, notificationSchema, Post, PostDataUnion, postDataUnionSchema, postSchema, Profile, profileSchema, ReactionData, reactionDataSchema, rsvpSchema } from "./models";
import { GroupWithMeta, groupWithMetaSchema } from "./internal";

export const dbNotificationSchema = notificationSchema.extend({
    post: postSchema.nullable().optional(),
});
export type DbNotification = Notification & { post?: DbPost | null, group?: Group | null };


const entryWithProfileSchema = z.discriminatedUnion('type', [
    z.object({
        type: z.literal('create'),
        data: postDataUnionSchema,
        profile: profileSchema,
        createdAt: z.string().datetime(),
    }),
    z.object({
        type: z.literal('edit'),
        data: postDataUnionSchema,
        profile: profileSchema,
        createdAt: z.string().datetime(),
    }),
    z.object({
        type: z.literal('delete'),
        data: z.any(),
        profile: profileSchema,
        createdAt: z.string().datetime(),
    }),
    z.object({
        type: z.literal('answer'),
        data: answerSchema,
        profile: profileSchema,
        createdAt: z.string().datetime(),
    }),
    z.object({
        type: z.literal('rsvp'),
        data: rsvpSchema,
        profile: profileSchema,
        createdAt: z.string().datetime(),
    }),
]);
export type DbEntry = Entry & { profile: Profile };

const mentionWithProfileSchema = mentionDataSchema.extend({
    profile: profileSchema,
});
export type DbMention = MentionData & { profile: Profile };

const reactionWithProfileSchema = reactionDataSchema.extend({
    profile: profileSchema,
});
export type DbReaction = ReactionData & { profile: Profile };

export const dbBasePostSchema = postSchema.extend({
    entries: entryWithProfileSchema.array(),
    audience: profileSchema.array(),
    group: groupWithMetaSchema,
    mentions: mentionWithProfileSchema.array(),
    replyCount: z.number(),
    repostCount: z.number(),
    reactions: reactionWithProfileSchema.array(),
    tags: hashtagSchema.array(),
    profile: profileSchema,
    data: postDataUnionSchema,
    groupId: z.string().nullable().optional(),
    seen: z.boolean().optional(),
});

export interface DbBasePost extends Post {
    entries: DbEntry[],
    audience: Profile[],
    group: GroupWithMeta,
    mentions: DbMention[],
    replyCount: number,
    repostCount: number,
    reactions: DbReaction[],
    tags: Hashtag[],
    profile: Profile,
    data: PostDataUnion,
    groupId: string | null | undefined,
    seen?: boolean,
}

export const dbPostWithReplySchema = dbBasePostSchema.extend({
    replyTo: dbBasePostSchema.nullable().optional(),
    inReplyToId: z.string().nullable().optional(),
});

export const dbPostSchema = dbPostWithReplySchema.extend({
    repost: dbPostWithReplySchema.nullable().optional(),
});
export interface DbPost extends DbBasePost {
    replyTo?: DbBasePost | null;
    repost?: DbPost | null;
    inReplyToId?: string | null;
}