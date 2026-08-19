import { z } from 'zod';
import {
  notificationStatsSchema,
  pushNotificationSchema,
  type PushNotification,
} from './notifications';
import {
  AccessToken,
  accessTokenSchema,
  accountInteractionsSchema,
  accountNameSchema,
  accountSchema,
  answerSchema,
  applicationDataSchema,
  groupDataSchema,
  GroupRoleData,
  groupRoleSchema,
  groupSchema,
  guestDataSchema,
  hashtagSchema,
  InviteLink,
  inviteLinkSchema,
  latLngSchema,
  locationSchema,
  type MediaAttachment,
  mediaAttachmentSchema,
  mentionDataSchema,
  postDataUnionSchema,
  postTypeSchema,
  profileDataSchema,
  profileStatsSchema,
  reactionDataSchema,
  Report,
  reportDataSchema,
  reportSchema,
  resourceSchema,
  rsvpSchema,
  Scope,
  scopeSchema,
  VisibilityType,
  visibilityTypeSchema,
} from './models';
import { groupWithMetaSchema } from './internal';
import { communityConfigSchema } from './config';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

export const errorResponseBodySchema = z.object({
  success: z.literal(false),
  message: z.string(),
});
export type ErrorResponseBody = z.infer<typeof errorResponseBodySchema>;

export const publicAccountSchema = z
  .object({
    id: z.uuid(),
    email: z.email(),
    emailValidated: z.boolean().default(false),
  })
  .openapi('Account', { type: 'object' });
export type PublicAccount = z.infer<typeof publicAccountSchema>;

export const publicProfileSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(['local', 'guest', 'federated']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
  handle: accountNameSchema,
  avatar: z.string().url().nullable().optional(),
  header: z.string().url().nullable().optional(),
  displayName: z.string().max(30).optional(),
  bio: z.string().optional(),
  location: locationSchema.optional(),
  locked: z.boolean().optional(),
  bot: z.boolean().optional(),
  discoverable: z.boolean().optional(),
  memberships: z
    .array(
      groupRoleSchema.extend({
        group: groupSchema,
      }),
    )
    .optional()
    .transform((memberships) =>
      memberships?.filter((m) =>
        m.group.capabilities?.none?.add?.includes('core-groups-read'),
      ),
    ),
  fields: z
    .array(
      z.object({
        name: z.string().max(255).min(1),
        value: z.string().max(255),
      }),
    )
    .max(4)
    .optional(),
  profileStats: profileStatsSchema.optional(),
});

export type PublicProfile = z.infer<typeof publicProfileSchema>;

export const publicAccessTokenSchema = accessTokenSchema
  .omit({ signedToken: true })
  .extend({
    ownedBy: publicProfileSchema.optional(),
    scopes: z.array(scopeSchema).optional(),
  })
  .openapi('PublicAccessToken');

export type PublicAccessToken = Omit<AccessToken, 'signedToken'> & {
  ownedBy?: PublicProfile;
  scopes?: Scope[];
};

export const jamParticipantProfileSchema = publicProfileSchema.extend(
  guestDataSchema.partial().shape,
);

export const mentionWithPublicProfileSchema = mentionDataSchema.extend({
  profile: publicProfileSchema,
});
export type MentionWithPublicProfile = z.infer<
  typeof mentionWithPublicProfileSchema
>;

export const entryWithPublicProfileSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('create'),
    data: postDataUnionSchema,
    profile: publicProfileSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('edit'),
    data: postDataUnionSchema,
    profile: publicProfileSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('delete'),
    data: z.any(),
    profile: publicProfileSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('answer'),
    data: answerSchema,
    profile: publicProfileSchema,
    createdAt: z.string().datetime(),
  }),
  z.object({
    type: z.literal('rsvp'),
    data: rsvpSchema,
    profile: publicProfileSchema,
    createdAt: z.string().datetime(),
  }),
]);

export type EntryWithPublicProfile = z.infer<
  typeof entryWithPublicProfileSchema
>;

const reactionWithPublicProfileSchema = reactionDataSchema.extend({
  profile: publicProfileSchema,
});
export type ReactionWithPublicProfile = z.infer<
  typeof reactionWithPublicProfileSchema
>;

const repostWithPublicProfileSchema = z.object({
  profile: publicProfileSchema,
  createdAt: z.string().datetime(),
});
export type RepostWithPublicProfile = z.infer<
  typeof repostWithPublicProfileSchema
>;

export const publicReplyPostSchema = z.object({
  id: z.string(),
  type: postTypeSchema,
  profile: publicProfileSchema,
  data: postDataUnionSchema,
  entries: entryWithPublicProfileSchema.array(),
  createdAt: z.string().datetime(),
  deletedAt: z.string().datetime().optional().nullable(),
  visibility: visibilityTypeSchema,
  group: groupWithMetaSchema.optional().nullable(),
  audience: z.array(publicProfileSchema).optional().nullable(),
});
export type PublicReplyPost = z.infer<typeof publicReplyPostSchema>;

export const publicApplicationSchema = applicationDataSchema.pick({
  name: true,
  website: true,
});
export type PublicApplication = z.infer<typeof publicApplicationSchema>;

const publicRsvpSchema = rsvpSchema.extend({
  profile: publicProfileSchema,
  createdAt: z.string().datetime(),
});
export type PublicRsvp = z.infer<typeof publicRsvpSchema>;

const basePublicPostSchema = publicReplyPostSchema.extend({
  repostCount: z.number(),
  replyCount: z.number(),
  reactions: reactionWithPublicProfileSchema.array(),
  /** Capped lean list of who reposted (most recent). Count stays in repostCount. */
  reposts: repostWithPublicProfileSchema.array(),
  application: publicApplicationSchema.optional(),
  mentions: z.array(mentionWithPublicProfileSchema),
  tags: z.array(hashtagSchema),
  groupId: z.string().optional().nullable(),
  groupDiscoverable: z.boolean().optional().nullable(),
  updatedAt: z.string().datetime(),
  accountInteractions: accountInteractionsSchema.optional(),
  rsvps: publicRsvpSchema.array(),
  seen: z.boolean().optional(),
});

const withReplyPostSchema = basePublicPostSchema.extend({
  inReplyToId: z.string().optional().nullable(),
  replyTo: publicReplyPostSchema.optional().nullable(),
});

export const publicPostSchema = withReplyPostSchema
  .extend({
    repost: basePublicPostSchema.optional().nullable(),
  })
  .openapi('Post');
export type PublicPost = z.infer<typeof publicPostSchema>;
export type PublicPostInput = z.input<typeof publicPostSchema>;

export const publicJamEventSchema = z.object({
  jamId: z.string(),
  type: z.enum(['message', 'reaction', 'attendance', 'active']),
  content: z.string(),
  sender: z.object({
    profile: publicProfileSchema.extend({
      email: z.string().email().optional(),
    }),
    participantId: z.string(),
  }),

  joinTime: z.string().datetime().optional(),
  leaveTime: z.string().datetime().optional(),
});

export type PublicJamEvent = z.infer<typeof publicJamEventSchema>;

export const publicNotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),
  seen: z.boolean().optional(),
  read: z.boolean().optional(),
  createdAt: z.string().datetime(),
  senderProfile: publicProfileSchema.nullable().optional(),
  group: groupSchema.nullable().optional(),
  post: publicPostSchema.nullable().optional(),
  data: z.any().optional(),
});
export type PublicNotification = z.infer<typeof publicNotificationSchema>;

export const publicGroupMemberSchema = groupRoleSchema.extend({
  profile: publicProfileSchema,
});

export interface PublicGroupMember extends GroupRoleData {
  profile: PublicProfile;
}

export const accountCreationDataSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  emailValidated: z.boolean().optional(),
  inviteCode: z.string().optional(),
  profile: z.object({
    handle: z.string().min(4).max(255),
    avatar: z.string().url().optional(),
    displayName: profileDataSchema.shape.displayName,
  }),
});

export type AccountCreationData = z.infer<typeof accountCreationDataSchema>;

export const accountUpdateDataSchema = z.object({
  account: accountSchema,
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  emailValidated: z.boolean().optional(),
});

export type AccountUpdateData = z.infer<typeof accountUpdateDataSchema>;

export type OpenpeepsErrorCode = 404 | 500 | 409 | 422 | 403 | 401;
export interface OpenpeepsErrorData {
  code?: OpenpeepsErrorCode;
  errorKey: string;
  parameters?: Record<string, unknown>;
}
export interface OpenpeepsError extends OpenpeepsErrorData {
  __allPeepError__: true;
}

export const serverInfoSchema = z.object({
  version: z.string(),
  environment: z.string(),
  publicContent: z.boolean(),
  /** Latest post view (`post_seen.created_at`); null if none yet. */
  lastAccessed: z.iso.datetime().nullable(),
  maxProfiles: z.number().int().nonnegative().optional(),
  communityConfig: communityConfigSchema,
  jams: z.object({
    livekit: z.object({
      url: z.string(),
      enabled: z.boolean(),
      recordingEnabled: z.boolean(),
    }),
  }),
  vapid: z.object({
    publicKey: z.string().optional(),
  }),
  sentryConfig: z.object({
    enabled: z.boolean(),
    dsn: z.string().optional(),
    replayEnabled: z.boolean().optional(),
  }),
  payments: z.object({
    stripe: z.object({
      paidMembership: z.object({
        enabled: z.boolean(),
      }),
    }),
  }),
  sso: z
    .object({
      oidc: z.array(
        z.object({
          id: z.string(),
          name: z.string(),
        }),
      ),
    })
    .optional(),
});

export type ServerInfo = z.infer<typeof serverInfoSchema>;

export const unseenPostCountsSchema = z.object({
  groups: z.record(z.string(), z.number()),
  direct: z.record(z.string(), z.number()),
});
export type UnseenPostCounts = z.infer<typeof unseenPostCountsSchema>;

export const pushPayloadSchema = z.object({
  notification: pushNotificationSchema,
  notificationStats: notificationStatsSchema,
});
export type PushPayload = z.infer<typeof pushPayloadSchema>;

export const webhookDataSchema = z.object({
  type: z.literal('pushNotification'),
  payload: pushPayloadSchema,
});
export type WebhookData = z.infer<typeof webhookDataSchema>;

export const webhookKeyResponseSchema = z.object({
  publicKey: z.string(),
});
export type WebhookKeyResponse = z.infer<typeof webhookKeyResponseSchema>;
export const webhookVerifyRequestSchema = z.object({
  token: z.string(),
});
export type WebhookVerifyRequest = z.infer<typeof webhookVerifyRequestSchema>;
export const webhookVerifyResponseSchema = z.object({
  success: z.literal(true),
  payload: z.record(z.string(), z.unknown()),
});
export type WebhookVerifyResponse = z.infer<typeof webhookVerifyResponseSchema>;

export const publicInviteLinkSchema = inviteLinkSchema.extend({
  profile: publicProfileSchema,
  redemptions: publicProfileSchema.array(),
});

export interface PublicInviteLink extends InviteLink {
  profile: PublicProfile;
  redemptions: PublicProfile[];
}

export const muteParticipantRequestSchema = z.object({
  identity: z.string().uuid(),
  trackSid: z.string(),
});

export type MuteParticipantRequest = z.infer<
  typeof muteParticipantRequestSchema
>;
export interface Thread extends PublicPost {
  children: Thread[];
}

export interface AudienceSetting {
  visibility: VisibilityType;
  groupId?: string | null;
  audience?: PublicProfile[] | null;
}

export const guestPassRequestSchema = z.object({
  displayName: z.string().max(30),
  email: z.string().email(),
  resource: resourceSchema,
});
export type GuestPassRequest = z.infer<typeof guestPassRequestSchema>;

export const logRowSchema = z.object({
  level: z.string(),
  message: z.string(),
  timestamp: z.string().date(),
  meta: z.any(),
  namespace: z.string(),
});
export type LogRow = z.infer<typeof logRowSchema>;
export const successResponseSchema = z.object({
  success: z.literal(true),
});
export type SuccessResponse = z.infer<typeof successResponseSchema>;

export const successFailureResponseSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  key: z.string().optional(),
});
export type SuccessFailureResponse = z.infer<
  typeof successFailureResponseSchema
>;

export const fetchUrlRequestSchema = z.object({
  url: z.url(),
});

export const fetchUrlReponseSchema = z.object({
  statusCode: z.number(),
  success: z.boolean(),
  data: z.object({
    image: z.string(),
    title: z.string(),
    description: z.string(),
    url: z.string(),
  }),
});

export type FetchUrlResponse = z.infer<typeof fetchUrlReponseSchema>;

export const loginRequestSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});
export type LoginRequest = z.infer<typeof loginRequestSchema>;

export type FetchUrlRequest = z.infer<typeof fetchUrlRequestSchema>;

export const registerRequestSchema = z.object({
  handle: accountNameSchema,
  email: z.email(),
  password: z
    .string()
    .min(8, { message: 'Your password should be at least 8 characters long' }),
  displayName: profileDataSchema.shape.displayName,
  confirmPassword: z.string().optional(),
  privacyPolicyAccepted: z.boolean(),
  inviteCode: z.string().optional(),
});
export type RegisterRequest = z.infer<typeof registerRequestSchema>;

export const registerFormSchema = registerRequestSchema
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.privacyPolicyAccepted, {
    message: 'You must agree to the privacy policy',
    path: ['privacyPolicyAccepted'],
  });
export const createGroupRequestSchema = groupDataSchema.extend({
  members: publicProfileSchema.array().optional(),
});
export type CreateGroupRequest = z.infer<typeof createGroupRequestSchema>;

export const requestResetPasswordRequestSchema = z.object({
  email: z.string().email(),
});
export type RequestResetPasswordRequest = z.infer<
  typeof requestResetPasswordRequestSchema
>;

export const resetPasswordRequestSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string().optional(),
});
export type ResetPasswordRequest = z.infer<typeof resetPasswordRequestSchema>;

export const resetPasswordFormSchema = resetPasswordRequestSchema.refine(
  (data) => data.password === data.confirmPassword,
  {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  },
);

export const validateEmailQuerySchema = z.object({
  token: z.string().min(1),
});
export type ValidateEmailQuery = z.infer<typeof validateEmailQuerySchema>;

export const tokenResponseSchema = z.object({
  success: z.literal(true),
  token: z.string(),
  checkoutUrl: z.string().optional(),
});
export type TokenResponse = z.infer<typeof tokenResponseSchema>;

export const jamTokenResponseSchema = tokenResponseSchema.extend({
  livekitUrl: z.string(),
});
export type JamTokenResponse = z.infer<typeof jamTokenResponseSchema>;

export interface Credentials {
  token: string;
}

const focusCoordinatesPattern = /^-?\d+,-?\d+$/;

// NOTE: `file` / `thumbnail` accept a `File` (browser) or any
// multipart body — modelled as `z.any()` for the API contract so the OpenAPI
// generator can produce a binary content schema. Handlers should runtime-check
// they actually got a `File` / `Blob` instance.
export const mediaStorageRequestSchema = z.object({
  description: z.string().optional(),
  file: z.any().openapi({
    type: 'string',
    format: 'binary',
  }) as unknown as z.ZodType<File>,
  thumbnail: z
    .any()
    .optional()
    .openapi({ type: 'string', format: 'binary' }) as unknown as z.ZodType<
    File | undefined
  >,
  usage: z.string(),
  focus: z
    .string()
    .regex(focusCoordinatesPattern, 'focus must be "<integer>,<integer>"')
    .optional(),
});
export type MediaStorageRequest = z.infer<typeof mediaStorageRequestSchema>;
// `z.input` widens `z.any()` to `unknown`, which is incompatible with the
// `FormDataSource` constraint used by `@openpeepshq/fetch-client`. We retain the
// pre-transform `focus` input but pin `file` / `thumbnail` to the binary types
// that the client actually sends.
export type MediaStorageRequestInput = Omit<
  z.input<typeof mediaStorageRequestSchema>,
  'file' | 'thumbnail'
> & {
  file: File;
  thumbnail?: File;
};

export const mediaProgressEventSchema = z
  .object({
    mediaAttachment: mediaAttachmentSchema,
    progressPercent: z.number().min(0).max(100),
    estimatedRemainingMs: z.number().optional(),
  })
  .openapi('MediaProgressEvent');
// Using a manual type because `modelSchema(...)` widens to `ZodObject<ZodRawShape>`
// and loses the precise field types when inferred via `z.infer`.
export type MediaProgressEvent = {
  mediaAttachment: MediaAttachment;
  progressPercent: number;
  estimatedRemainingMs?: number;
};

export const mediaStreamStatusSchema = z
  .enum(['processing', 'ready', 'error'])
  .openapi('MediaStreamStatus');
export type MediaStreamStatus = z.infer<typeof mediaStreamStatusSchema>;

export const mediaStreamSchema = z
  .object({
    storageId: z.string(),
    status: mediaStreamStatusSchema,
    error: z.string().optional(),
  })
  .openapi('MediaStream');
export type MediaStream = z.infer<typeof mediaStreamSchema>;

export const mediaStreamRequestSchema = z
  .object({
    url: z.string().url(),
  })
  .openapi('MediaStreamRequest');
export type MediaStreamRequest = z.infer<typeof mediaStreamRequestSchema>;

export const updateProfileRequestSchema = profileDataSchema.partial({
  handle: true,
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const updateAccountPasswordRequestSchema = z.object({
  email: z.string().email().optional(),
  newPassword: z.preprocess(
    (s) => s || undefined,
    z.string().min(8).optional(),
  ),
  oldPassword: z.string().min(8),
  confirmPassword: z.preprocess(
    (s) => s || undefined,
    z.string().min(8).optional(),
  ),
});
export type UpdateAccountPasswordRequest = z.infer<
  typeof updateAccountPasswordRequestSchema
>;
export const updateAccountPasswordFormSchema =
  updateAccountPasswordRequestSchema
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: 'Passwords do not match',
      path: ['confirmPassword'],
    })
    .refine((data) => data.oldPassword, {
      message:
        'You must provide your old password to change your password or email',
      path: ['__form__'],
    });

export const updateAccountEmailRequestSchema = z.object({
  newEmail: z.email(),
  oldEmail: z.email(),
});

export type UpdateAccountEmailRequest = z.infer<
  typeof updateAccountEmailRequestSchema
>;

export const geocodingResultSchema = z.object({
  name: z.string(),
  bbox: latLngSchema.array().length(2),
  center: latLngSchema,
  icon: z.string().optional(),
  properties: z.record(z.string(), z.any()).optional(),
});
export type GeocodingResult = z.infer<typeof geocodingResultSchema>;

export const reportCreationDataSchema = z.object({
  report: reportDataSchema,
  profileId: z.string(),
  postIds: z.string().array(),
});
export type ReportCreationData = z.infer<typeof reportCreationDataSchema>;

export const jamStateSchema = z.object({
  active: z.boolean(),
  participants: z.uuid().array(),
});
export type JamState = z.infer<typeof jamStateSchema>;

export const publicReportSchema = reportSchema.extend({
  reporterProfile: publicProfileSchema,
  reportedProfile: publicProfileSchema,
  reportedPosts: z.array(publicPostSchema),
});
export type PublicReport = Report & {
  reporterProfile: PublicProfile;
  reportedProfile: PublicProfile;
  reportedPosts: PublicPost[];
};

export const chronologicalInfiniteQueryParamsSchema = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});
export type ChronologicalInfiniteQueryParams =
  | z.infer<typeof chronologicalInfiniteQueryParamsSchema>
  | undefined;
export const offsetInfiniteQueryParamsSchema = z.object({
  offset: z.coerce.number().optional(),
  limit: z.coerce.number().optional(),
});
export type OffsetInfiniteQueryParams =
  | z.infer<typeof offsetInfiniteQueryParamsSchema>
  | undefined;

export const searchResultItemSchema = (baseSchema: z.ZodType) =>
  z.object({
    score: z.number(),
    data: baseSchema,
  });
export type SearchResultItem<T> = {
  score: number;
  data: T;
};
export const searchResultSchema = (baseSchema: z.ZodType) =>
  searchResultItemSchema(baseSchema).array();
export type SearchResult<T> = SearchResultItem<T>[];

export const searchResultCountsSchema = z.object({
  groups: z.number(),
  profiles: z.number(),
  posts: z.number(),
  events: z.number(),
  jams: z.number(),
});
export type SearchResultCounts = z.infer<typeof searchResultCountsSchema>;

// Plain object schema — used as API contract & in OpenAPI generation. Cross-
// field validation lives on `postCreationDataFormSchema` below to keep this
// schema introspectable by zod-to-openapi (which can't walk zod-4 `.refine()`
// wrappers, as they appear as a `ZodCustom` with `def.type === 'custom'`).
export const postCreationDataSchema = z.object({
  visibility: visibilityTypeSchema,
  type: postTypeSchema,
  data: postDataUnionSchema,
  inReplyToId: z.uuid().nullable().optional(),
  mentions: mentionWithPublicProfileSchema.array().nullable().optional(),
  audience: publicProfileSchema.array().nullable().optional(),
  groupId: z.uuid().nullable().optional(),
  reportId: z.uuid().nullable().optional(),
  capabilitiesNeeded: z.string().array().nullable().optional(),
});

export type PostCreationData = z.infer<typeof postCreationDataSchema>;

export const postCreationDataFormSchema = postCreationDataSchema
  .refine(
    (data) => {
      if (data.type !== 'event') return true;
      if (data.data.type !== 'event') return true;
      return !!data.data.name;
    },
    {
      message: 'Name is required',
      path: ['data', 'name'],
    },
  )
  .refine(
    (data) => {
      if (data.type !== 'event') return true;
      if (data.data.type !== 'event') return true;

      const { start, end } = data.data;

      if (end && start && new Date(end) < new Date(start)) {
        return false;
      }

      return true;
    },
    {
      message: 'End date cannot be before start date',
      path: ['data', 'end'],
    },
  );

const answerWithPublicProfileSchema = answerSchema.extend({
  profile: publicProfileSchema,
});
export type AnswerWithPublicProfile = z.infer<
  typeof answerWithPublicProfileSchema
>;

export const paymentCheckoutSchema = successFailureResponseSchema.extend({
  url: z.url().nullable(),
});
export type PaymentCheckoutResponse = z.infer<typeof paymentCheckoutSchema>;

export const jamObserverResponseSchema = z.object({
  path: z.string().optional(),
});

export type JamObserverResponseData = z.infer<typeof jamObserverResponseSchema>;

export const jamRtmpStreamRequestSchema = z.object({
  url: z.string().min(1),
  streamKey: z.string().min(1),
});
export type JamRtmpStreamRequest = z.infer<typeof jamRtmpStreamRequestSchema>;

export const jamRtmpStreamResponseSchema = z.object({
  id: z.string(),
  status: z.enum(['requested', 'active', 'completed', 'failed']),
  destinationHost: z.string().optional(),
  egressId: z.string().optional(),
});
export type JamRtmpStreamResponse = z.infer<typeof jamRtmpStreamResponseSchema>;

export const accessTokenCreationDataSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  scopes: z.array(scopeSchema).optional(),
  expirationTime: z.string(),
});
export type AccessTokenCreationData = z.infer<
  typeof accessTokenCreationDataSchema
>;
