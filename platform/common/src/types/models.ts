import { z, util, ZodObject, ZodRawShape } from 'zod';
import validator from 'validator';
import ISO6391 from 'iso-639-1';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { groupRelationships } from './capabilities';
import { capabilitiesSchema } from './config';

extendZodWithOpenApi(z);

export const handleRegexBase = '[a-zA-Z0-9_-]{1,16}';

export const handleRegex = new RegExp(`^${handleRegexBase}$`);

/** `@handle` using the allowed handle charset. No `\\b` — hyphens are not word chars. */
export const mentionHandleRegexBase = `(^|[\\s(>])@(${handleRegexBase})(?=\\s|$|[.,!?;:])`;

export const forbiddenHandles = [
  'admin',
  'allpeep',
  'api',
  'app',
  'auth',
  'config',
  'core',
  'db',
  'email',
  'federation',
  'jam',
  'media',
  'network',
  'plugins',
  'undefined',
  'jamStarted',
  'jamSpeaker',
  'jamModerator',
  'new',
];

export const baseSchemaShape = {
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
  deletedAt: z.iso.datetime().nullable().optional(),
};

export const baseSchema = z.object(baseSchemaShape);
export type Base<T> = z.infer<typeof baseSchema> & T;

export const idSchemaShape = {
  id: z.uuid(),
};

export const idSchema = z.object(idSchemaShape);
export type Id = z.infer<typeof idSchema>;

const modelBaseFields = {
  ...baseSchemaShape,
  ...idSchemaShape,
};

/**
 * Preserves the data-schema shape through declaration emit (see ZodObject extend typing).
 * A non-generic parameter used to widen `ZodObject<ZodRawShape>` destroys output `.d.ts`
 * (index signature + unknown), which breaks consumers that need structural JSON types.
 */
export const modelSchema = <T extends ZodRawShape>(
  dataSchema: ZodObject<T>,
): ZodObject<util.Extend<T, util.Writeable<typeof modelBaseFields>>> =>
  dataSchema.extend(modelBaseFields);

export type Model<T> = Base<T> & { id: string };

const connectionSchema = <
  T extends ZodRawShape,
  TFrom extends ZodRawShape,
  TTo extends ZodRawShape,
>(
  dataSchema: ZodObject<T>,
  from: ZodObject<TFrom>,
  to: ZodObject<TTo>,
) =>
  modelSchema(dataSchema).extend({
    from,
    to,
  });

export const applicationDataSchema = z.object({
  id: z.string(),
  secret: z.string(),
  name: z.string(),
  website: z.string(),
});
export type ApplicationData = z.infer<typeof applicationDataSchema>;
export type Application = Model<ApplicationData>;

export const accountDataSchema = z.object({
  email: z.string().email(),
  passwordHash: z.string(),
  emailValidated: z.boolean().default(false).optional(),
  guest: z.boolean().optional(),
});
export type AccountData = z.infer<typeof accountDataSchema>;
export const accountSchema = modelSchema(accountDataSchema);
export type Account = Model<AccountData>;

export const roleDataSchema = z.object({
  key: z.string().regex(/^[a-z-]{1,32}$/),
  default: z.boolean(),
  displayName: z.string().max(32),
  description: z.string().optional(),
  capabilities: capabilitiesSchema,
});

export type RoleData = z.infer<typeof roleDataSchema>;
export const roleSchema = modelSchema(roleDataSchema);
export type Role = Model<RoleData>;

export const profileSettingsDefaultsSchema = z.object({
  privacy: z.enum(['public', 'unlisted', 'private']).optional(),
  sensitive: z.boolean().optional(),
  language: z
    .string()
    .refine(validator.isISO6391)
    .optional()
    .openapi({ type: 'string', description: 'ISO-639-1 language code' }),
});
export type ProfileSettingsDefaults = z.infer<
  typeof profileSettingsDefaultsSchema
>;

export const profileNotificationSettings = z.object({
  create: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
});
export type ProfileNotificationSettings = z.infer<
  typeof profileNotificationSettings
>;
export const jamSettingsSchema = z.object({
  backgroundObfuscation: z
    .discriminatedUnion('type', [
      z.object({
        type: z.literal('blur'),
        radius: z.number().int().positive().optional(),
      }),
      z.object({
        type: z.literal('image'),
        image: z.string().url(),
      }),
      z.object({
        type: z.literal('video'),
        video: z.string().url(),
      }),
      z.object({
        type: z.literal('none'),
      }),
    ])
    .optional(),
});
export const THEME_OPTIONS = ['community', 'light', 'dark', 'system'] as const;
export const ThemeOptionsSchema = z.enum(THEME_OPTIONS);
export type ThemeOptions = z.infer<typeof ThemeOptionsSchema>;

export type JamSettings = z.infer<typeof jamSettingsSchema>;
export const profileSettingsDataSchema = z.object({
  id: z.string(),
  language: z.string().optional(),
  theme: ThemeOptionsSchema.optional(),
  defaults: profileSettingsDefaultsSchema.optional(),
  notifications: z.record(z.string(), profileNotificationSettings).optional(),
  jamSettings: jamSettingsSchema.optional(),
  stripeSettings: z
    .object({
      customerId: z.string().optional(),
    })
    .optional(),
  feedSettings: z
    .object({
      communityFeed: z
        .object({
          showGroupPosts: z.boolean().optional(),
        })
        .optional(),
    })
    .default({ communityFeed: { showGroupPosts: true } })
    .optional(),
});
export type ProfileSettingsData = z.infer<typeof profileSettingsDataSchema>;

export const profileSettingsSchema = modelSchema(profileSettingsDataSchema);
export type ProfileSettings = Model<ProfileSettingsData>;

export const accountNameSchema = z
  .string()
  .refine((value: string) => !forbiddenHandles.includes(value.toLowerCase()), {
    message: 'Handle is reserved',
  })
  .refine((value: string) => handleRegex.test(value ?? ''), {
    message:
      'Handle must be 1–16 characters: letters, numbers, underscores, or hyphens (no spaces or punctuation)',
  })
  .openapi({
    type: 'string',
    pattern: `^${handleRegexBase}$`,
    description:
      'Account handle: 1-16 alphanumeric / underscore / hyphen characters, excluding a reserved set.',
  });

const profileResourceTypes = [
  'jams',
  'posts',
  'self',
  'profiles',
  'posts',
  'groups',
  'reports',
  'webhooks',
  'notifications',
] as const;

export const profileResourceTypeSchema = z.enum(profileResourceTypes);
export type ProfileResourceType = z.infer<typeof profileResourceTypeSchema>;

const serviceResourceTypes = [
  'analytics',
  'render', // Deprecated
  'webhooks',
  'posts',
  'profiles',
  'db',
] as const;

export const serviceResourceTypeSchema = z.enum(serviceResourceTypes);
export type ServiceResourceType = z.infer<typeof serviceResourceTypeSchema>;

export type ResourceType = ProfileResourceType | ServiceResourceType | '*';

const resourceTypeSchema = z.enum([
  ...profileResourceTypes,
  ...serviceResourceTypes,
  '*',
]);

export const resourceSchema = z.object({
  type: resourceTypeSchema,
  id: z.union([z.string(), z.literal('*')]).optional(),
});

export type Resource = {
  type: ResourceType;
  id?: string | '*';
};

export const scopeLevelSchema = z.enum(['write', 'read', 'admin']);
export type ScopeLevel = z.infer<typeof scopeLevelSchema>;

export const scopeSchema = z.object({
  scopeLevel: scopeLevelSchema.optional(),
  resource: resourceSchema,
});
export type Scope = z.infer<typeof scopeSchema>;

export const accessTokenDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  signedToken: z.string(),
  revokedAt: z.iso.datetime().nullable().optional(),
  expiresAt: z.iso.datetime().nullable().optional(),
});

export type AccessTokenData = z.infer<typeof accessTokenDataSchema>;
export const accessTokenSchema = modelSchema(accessTokenDataSchema);

export const latLngSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  alt: z.number().optional(),
});
export type LatLng = z.infer<typeof latLngSchema>;

export const locationSchema = z.object({
  text: z.string(),
  coordinates: latLngSchema.optional(),
});

export type Location = z.infer<typeof locationSchema>;
export const profileDataSchema = z.object({
  handle: accountNameSchema,
  deletedHandle: accountNameSchema.optional(),
  avatar: z.url().nullable().optional(),
  header: z.url().nullable().optional(),
  displayName: z.string().max(30).optional(),
  bio: z.string().optional(),
  timeZone: z.string().optional(),
  location: locationSchema.optional(),
  locked: z.boolean().optional(),
  bot: z.boolean().optional(),
  discoverable: z.boolean().optional(),
  hideSocialGraph: z.boolean().optional(),
  indexable: z.boolean().optional(),
  fields: z
    .array(
      z.object({
        name: z.string().max(255).min(1),
        value: z.string().max(255),
      }),
    )
    .optional(),
  activityPub: z
    .object({
      domain: z.string().min(4), // TODO maybe replace with regex
    })
    .optional(),
  type: z.enum(['local', 'guest', 'federated']),
  guestData: z
    .object({
      email: z.email().optional(),
      resource: resourceSchema.optional(),
    })
    .optional(),
});

export type ProfileData = z.infer<typeof profileDataSchema>;
export const profileSchema = modelSchema(profileDataSchema);
export type Profile = Model<Base<ProfileData>>;

/** `ownedBy` is present when loaded via mapping; not stored on the token document. */
export type AccessToken = Model<AccessTokenData> & { ownedBy?: Profile };

export const accountWithMetaSchema = accountSchema.extend({
  profiles: z.array(profileSchema),
});
export interface AccountWithMeta extends Account {
  profiles: Profile[];
}

export const jamDataSchema = z
  .object({
    moderators: z.string().array(),
    speakers: z.string().array().optional(),
    presenters: z.string().array().optional(),
    audience: z.string().array().optional(),
    videoEnabled: z.boolean(),
    type: z.enum(['video-call']),
    maxSpeakers: z.number().int().positive().optional(),
    maxPresenters: z.number().int().positive().optional(),
    maxAudience: z.number().int().positive().optional(),
    waitingRoom: z.boolean().optional(),
  })
  .openapi('Jam');

export const jamSchema = jamDataSchema;
export type JamData = z.infer<typeof jamDataSchema>;
export type Jam = JamData;

export const followDataSchema = z.object({
  reblogs: z.boolean().optional(),
  notify: z.boolean().optional(),
  languages: z
    .array(
      z
        .string()
        .refine(validator.isISO6391)
        .openapi({ type: 'string', description: 'ISO-639-1 language code' }),
    )
    .optional(),
});

export type FollowData = z.infer<typeof followDataSchema>;
export const followSchema = connectionSchema(
  followDataSchema,
  profileSchema,
  profileSchema,
);

export type Follow = z.infer<typeof followSchema>;

export const visibilityTypeValues = [
  'public',
  'unlisted',
  'private',
  'direct',
  'local',
  'group',
  'report',
] as const;

export const visibilityTypeSchema = z.enum(visibilityTypeValues);

export type VisibilityType = z.infer<typeof visibilityTypeSchema>;

export const postTypeSchema = z.enum(['note', 'question', 'event', 'article']);
export type PostType = z.infer<typeof postTypeSchema>;

export const mediaAttachmentStatusSchema = z.enum([
  'processing',
  'ready',
  'failed',
]);
export type MediaAttachmentStatus = z.infer<typeof mediaAttachmentStatusSchema>;

export const mediaAttachmentDataSchema = z
  .object({
    type: z.string(),
    url: z.url(),
    previewUrl: z.url().nullable(),
    textUrl: z.null(),
    filename: z.string(),
    meta: z.object({
      usage: z.string().optional(),
      focus: z
        .object({
          x: z.number(),
          y: z.number(),
        })
        .optional(),
      mimetype: z.string().optional(),
      size: z.number().optional(),
    }),
    description: z.string().optional(),
    blurhash: z.string().optional(),
    status: mediaAttachmentStatusSchema.optional(),
    error: z.string().optional(),
  })
  .openapi('MediaAttachment');
export const mediaAttachmentSchema = modelSchema(mediaAttachmentDataSchema);
export type MediaAttachmentData = z.infer<typeof mediaAttachmentDataSchema>;
export type MediaAttachment = Model<MediaAttachmentData>;

export const processingStatsDataSchema = z
  .object({
    mediaAttachmentId: z.string().uuid(),
    filesize: z.number(),
    filetype: z.string(),
    durationMs: z.number(),
  })
  .openapi('ProcessingStats');
export const processingStatsSchema = modelSchema(processingStatsDataSchema);
export type ProcessingStatsData = z.infer<typeof processingStatsDataSchema>;
export type ProcessingStats = Model<ProcessingStatsData>;

export const customEmojiSchema = z
  .object({
    shortcode: z.string(),
    url: z.url(),
    staticUrl: z.url(),
    visibleInPicker: z.boolean(),
    category: z.string(),
  })
  .openapi('CustomEmoji');
export type CustomEmoji = z.infer<typeof customEmojiSchema>;

export const noteSchema = z
  .object({
    type: z.literal('note'),
    content: z.string().optional(),
    sensitive: z.boolean().optional(),
    spoilerText: z.string().optional(),
    attachments: z.array(mediaAttachmentDataSchema).optional(),
    customEmojis: z.array(customEmojiSchema).optional(),
    language: z.enum(ISO6391.getAllCodes() as [string, ...string[]]).optional(),
  })
  .openapi('Note');
export type Note = z.infer<typeof noteSchema>;

/** Poll choices are stored short so they fit the vote UI on small screens. */
export const POLL_OPTION_MAX_LENGTH = 30;

export const questionSchema = noteSchema
  .extend({
    type: z.literal('question'),
    options: z
      .object({
        content: z.string().max(POLL_OPTION_MAX_LENGTH),
        type: z.literal('note'),
      })
      .array(),
    multiple: z.boolean().optional(),
    votersVisible: z.boolean().optional(),
    expiresAt: z.iso.datetime().optional(),
  })
  .openapi('Question');

export type Question = z.infer<typeof questionSchema>;

export const articleSchema = noteSchema
  .extend({
    type: z.literal('article'),
    image: z.url().optional(),
    title: z.string().optional(),
  })
  .openapi('Article');

export type Article = z.infer<typeof articleSchema>;

export const eventIsoDatetimeSchema = z.iso.datetime({
  offset: true,
  precision: 3,
});

export const recurrenceFreqSchema = z.enum(['DAILY', 'WEEKLY', 'MONTHLY']);
export type RecurrenceFreq = z.infer<typeof recurrenceFreqSchema>;

export const recurrenceWeekdaySchema = z.enum([
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
]);
export type RecurrenceWeekday = z.infer<typeof recurrenceWeekdaySchema>;

export const eventRecurrenceSchema = z
  .object({
    freq: recurrenceFreqSchema,
    interval: z.number().int().positive().optional(),
    byDay: recurrenceWeekdaySchema.array().optional(),
    until: eventIsoDatetimeSchema.optional(),
    count: z.number().int().positive().optional(),
  })
  .refine((value) => !(value.until && value.count), {
    message: 'until and count are mutually exclusive',
    path: ['until'],
  })
  .openapi('EventRecurrence');
export type EventRecurrence = z.infer<typeof eventRecurrenceSchema>;

export const eventOccurrenceExceptionSchema = z
  .object({
    recurrenceId: eventIsoDatetimeSchema,
    cancelled: z.boolean().optional(),
    start: eventIsoDatetimeSchema.optional(),
    end: eventIsoDatetimeSchema.optional(),
    physicalLocation: locationSchema.optional(),
  })
  .openapi('EventOccurrenceException');
export type EventOccurrenceException = z.infer<
  typeof eventOccurrenceExceptionSchema
>;

export const eventSchema = noteSchema
  .extend({
    type: z.literal('event'),
    name: z.string().optional(),
    timeZone: z.string().optional(),
    image: z.url().optional(),
    start: eventIsoDatetimeSchema,
    end: eventIsoDatetimeSchema.optional(),
    wholeDay: z.boolean(),
    maxAttendees: z.number().int().positive().optional(),
    attendeeListPublic: z.boolean().optional(),
    moderators: z.string().uuid().array().optional(),
    jam: jamSchema.optional(),
    physicalLocation: locationSchema.optional(),
    url: z.url().optional(),
    recurrence: eventRecurrenceSchema.optional(),
    exceptions: eventOccurrenceExceptionSchema.array().optional(),
  })
  .openapi('Event');

export type Event = z.infer<typeof eventSchema>;
export type EventWithId = z.infer<typeof eventSchema> & { id: string };

export const postDataUnionSchema = z.discriminatedUnion('type', [
  noteSchema,
  questionSchema,
  eventSchema,
  articleSchema,
]);

export type PostDataUnion = z.infer<typeof postDataUnionSchema>;

export const postDataSchema = z.object({
  type: postTypeSchema,
  visibility: visibilityTypeSchema,
  capabilitiesNeeded: z.string().array().optional(),
  data: postDataUnionSchema.optional(),
  creatorId: z.string(),
});
export type PostData = z.infer<typeof postDataSchema>;
export const postSchema = modelSchema(postDataSchema);
export type Post = Model<PostData>;

export const answerSchema = z
  .object({
    selection: z.number().array(),
  })
  .openapi('Answer');

export type Answer = z.infer<typeof answerSchema>;

export const rsvpResponseSchema = z.enum(['yes', 'no', 'tentative', 'removed']);
export type RsvpResponse = z.infer<typeof rsvpResponseSchema>;

export const rsvpSchema = z.object({
  response: rsvpResponseSchema,
  recurrenceId: eventIsoDatetimeSchema.optional(),
});
export type RSVP = z.infer<typeof rsvpSchema>;

export const entryDataSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create'),
    data: postDataUnionSchema,
  }),
  z.object({
    type: z.literal('edit'),
    data: postDataUnionSchema,
  }),
  z.object({
    type: z.literal('delete'),
    data: z.any(),
  }),
  z.object({
    type: z.literal('answer'),
    data: answerSchema,
  }),
  z.object({
    type: z.literal('rsvp'),
    data: rsvpSchema,
  }),
]);

export type EntryData = z.infer<typeof entryDataSchema>;

export type Entry = Model<EntryData & { profile: Profile }>;

export const accountInteractionsSchema = z.object({
  favorited: z.boolean(),
  reposted: z.boolean(),
  muted: z.boolean(),
  bookmarked: z.boolean(),
  pinned: z.boolean(),
});

export type AccountInteractions = z.infer<typeof accountInteractionsSchema>;

export const reportResolutionSchema = z.enum([
  'ignore',
  'remove',
  'warn',
  'ban',
  'other',
]);

export type ReportResolution = z.infer<typeof reportResolutionSchema>;

export const reportDataSchema = z
  .object({
    comment: z.string().max(1000),
    uri: z.string().url().optional(),
    forward: z.boolean().optional(),
    category: z.enum(['spam', 'violation', 'other']),
    ruleIds: z.array(z.number()).optional(),
    resolution: reportResolutionSchema.optional(),
  })
  .openapi('Report');

export type ReportData = z.infer<typeof reportDataSchema>;
export const reportSchema = modelSchema(reportDataSchema);
export type Report = Model<ReportData>;

export const notificationDataSchema = z.object({
  type: z.string(),
  profileId: z.string().uuid(),
  pushHandled: z.boolean().optional(),
  emailHandled: z.boolean().optional(),
  read: z.boolean().optional(),
  seen: z.boolean().optional(),
  postId: z.string().optional(),
  fromProfileId: z.string().uuid().optional(),
  groupId: z.string().uuid().optional(),
  data: z.unknown().optional(),
});
export const notificationSchema = modelSchema(notificationDataSchema);
export type NotificationData = z.infer<typeof notificationDataSchema>;

export type Notification<DataType = unknown> = Model<
  NotificationData & { data?: DataType }
>;

export const configDataSchema = z.object({
  config: z.any(),
});
export type ConfigData = z.infer<typeof configDataSchema>;
export type Config = Model<ConfigData>;

export const configDataWithDefaultsSchema = configDataSchema.extend({
  defaults: z.any(),
});
export type ConfigDataWithDefaults = z.infer<
  typeof configDataWithDefaultsSchema
>;

export const alertsSchema = z.object({
  poll: z.boolean(),
  followRequest: z.boolean(),
  status: z.boolean(),
  favorite: z.boolean(),
  follow: z.boolean(),
  repost: z.boolean(),
  mention: z.boolean(),
  update: z.boolean(),
  admin: z.object({
    signUp: z.boolean(),
    report: z.boolean(),
  }),
});

const pushSubscriptionWebDataSchema = z.object({
  type: z.literal('web'),
  deviceName: z.string().optional(),
  endpoint: z.string().url(),
  keys: z.object({
    auth: z.string(),
    p256dh: z.string(),
  }),
  alerts: alertsSchema.optional(),
});

const pushSubscriptionApnDataSchema = z.object({
  type: z.literal('apn'),
  deviceName: z.string().optional(),
  apnToken: z.string(),
  alerts: alertsSchema.optional(),
});

const pushSubscriptionFcmDataSchema = z.object({
  type: z.literal('fcm'),
  deviceName: z.string().optional(),
  fcmToken: z.string(),
  alerts: alertsSchema.optional(),
});

const pushSubscriptionWebhookDataSchema = z.object({
  type: z.literal('webhook'),
  url: z.url(),
  publicKey: z.string().min(1),
  alerts: alertsSchema.optional(),
});

export const pushSubscriptionDataSchema = z.discriminatedUnion('type', [
  pushSubscriptionWebDataSchema,
  pushSubscriptionApnDataSchema,
  pushSubscriptionFcmDataSchema,
  pushSubscriptionWebhookDataSchema,
]);
export type PushSubscriptionData = z.infer<typeof pushSubscriptionDataSchema>;

export const pushSubscriptionSchema = z.discriminatedUnion('type', [
  modelSchema(pushSubscriptionWebDataSchema),
  modelSchema(pushSubscriptionApnDataSchema),
  modelSchema(pushSubscriptionFcmDataSchema),
  modelSchema(pushSubscriptionWebhookDataSchema),
]);
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;
export const reactionTypeSchema = z.enum(['👍']);

export const reactionDataSchema = z.object({
  reaction: reactionTypeSchema,
});
export type ReactionData = z.infer<typeof reactionDataSchema>;
export type Reaction = Model<ReactionData>;

export const mentionDataSchema = z.object({
  text: z.string().optional(),
});
export type MentionData = z.infer<typeof mentionDataSchema>;
export type Mention = Model<MentionData>;

export const timelineValueSchema = z.object({
  start: z.string().datetime(),
  end: z.string().datetime(),
  value: z.number(),
});
export type TimelineValue = z.infer<typeof timelineValueSchema>;

export const profileStatsSchema = z.object({
  followersCount: z.number(),
  followingCount: z.number(),
});
export type ProfileStats = z.infer<typeof profileStatsSchema>;

export const GROUP_DISPLAY_NAME_MAX_LENGTH = 30;

export const groupDataSchema = z.object({
  handle: accountNameSchema,
  avatar: z.string().url().nullable().optional(),
  header: z.string().url().nullable().optional(),
  displayName: z
    .string()
    .max(GROUP_DISPLAY_NAME_MAX_LENGTH, {
      message: `Group name should be ${GROUP_DISPLAY_NAME_MAX_LENGTH} characters or fewer`,
    })
    .optional(),
  description: z.string().optional(),
  rules: z.string().optional(),
  pinnedPostId: z.string().optional(),
  discoverable: z.boolean().optional(),
  capabilities: z.record(z.string(), capabilitiesSchema),
});

export type GroupData = z.infer<typeof groupDataSchema>;

export const groupSchema = modelSchema(groupDataSchema);
export type Group = z.infer<typeof groupSchema>;

export const groupRoleSchema = z.object({
  roles: z.enum(groupRelationships).array().optional().nullable(),
});

export type GroupRoleData = z.infer<typeof groupRoleSchema>;

export const guestDataSchema = z.object({
  displayName: z.string(),
  email: z.email(),
});

export type GuestData = z.infer<typeof guestDataSchema>;

export const jamEventDataSchema = z.object({
  id: z.string(),
  jamId: z.string(),
  type: z.enum([
    'message',
    'reaction',
    'join',
    'leave',
    'start',
    'close',
    'recordStart',
    'recordStop',
    'streamStart',
    'streamStop',
  ]),
  profileId: z.string(),
  content: z.string().optional(),
  reaction: reactionTypeSchema.optional(),
  recurrenceId: eventIsoDatetimeSchema.optional(),
});

export type JamEventData = z.infer<typeof jamEventDataSchema>;

export const jamEventSchema = modelSchema(jamEventDataSchema);
export type JamEvent = Model<JamEventData>;

export const inviteLinkDataSchema = z.object({
  slug: z.string(),
  active: z.boolean(),
  emailPatterns: z.string().array().optional(),
  maxUses: z.number(),
  expiresAt: z.string().datetime(),
  customInvitationMessage: z.string().optional(),
  /** New members who redeem this link are added to these groups (as members). */
  groupIds: z.array(z.string()).optional(),
});
export type InviteLinkData = z.infer<typeof inviteLinkDataSchema>;

export const inviteLinkSchema = modelSchema(inviteLinkDataSchema);
export type InviteLink = Model<InviteLinkData>;

export const hashtagDataSchema = z.object({
  tag: z.string().optional(),
});
export type HashtagData = z.infer<typeof hashtagDataSchema>;
export const hashtagSchema = modelSchema(hashtagDataSchema);
export type Hashtag = Model<HashtagData>;

export const normalizeHashtagTag = (tag: string) => tag.toLowerCase();

export const hashtagRegexBase = '(?<!\\S)#([a-z0-9_]+)(?![a-z0-9_])';
export const hashtagRegex = new RegExp(hashtagRegexBase, 'gi');

export const jamRecordingTypeSchema = z.enum([
  'compositeVideo',
  'compositeAudio',
  'streams',
]);
export type JamRecordingType = z.infer<typeof jamRecordingTypeSchema>;

export const jamRecordingKindSchema = z.enum(['file', 'rtmp']);
export type JamRecordingKind = z.infer<typeof jamRecordingKindSchema>;

export const jamRecordingDataSchema = z.object({
  status: z.enum(['requested', 'active', 'completed', 'failed']),
  kind: jamRecordingKindSchema.optional(),
  destinationHost: z.string().optional(),
  egressId: z.string().optional(),
  attachment: mediaAttachmentSchema.optional(),
  replyPostId: z.string().optional(),
});
export type JamRecordingData = z.infer<typeof jamRecordingDataSchema>;
export const jamRecordingSchema = modelSchema(jamRecordingDataSchema);
export type JamRecording = Model<JamRecordingData>;
