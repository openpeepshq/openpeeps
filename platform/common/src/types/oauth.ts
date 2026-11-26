import { z } from 'zod';

/** Profile resource types a third-party client may request `:read`/`:write` on. */
export const OAUTH_API_RESOURCE_TYPES = [
  'posts',
  'profiles',
  'groups',
  'jams',
  'conversations',
  'reports',
  'notifications',
] as const;

export const OIDC_SCOPES = [
  'openid',
  'profile',
  'email',
  'offline_access',
] as const;

/** Full account access, only grantable to admin-marked first-party clients. */
export const OAUTH_FULL_ACCESS_SCOPE = '*:admin';

const redirectUrisSchema = z.array(z.string().min(1)).min(1).max(10);

export const oauthClientSchema = z.object({
  id: z.string(),
  name: z.string(),
  redirectUris: z.array(z.string()),
  confidential: z.boolean(),
  firstParty: z.boolean(),
  dynamic: z.boolean(),
  clientUri: z.string().nullable().optional(),
  logoUri: z.string().nullable().optional(),
  createdAt: z.string(),
});
export type OAuthClient = z.infer<typeof oauthClientSchema>;

export const oauthClientCreationSchema = z.object({
  name: z.string().trim().min(1).max(100),
  redirectUris: redirectUrisSchema,
  confidential: z.boolean().default(false),
  firstParty: z.boolean().default(false),
  clientUri: z.url().optional(),
  logoUri: z.url().optional(),
});
export type OAuthClientCreation = z.input<typeof oauthClientCreationSchema>;

export const oauthClientCreatedSchema = oauthClientSchema.extend({
  /** Only returned once, at creation, for confidential clients. */
  clientSecret: z.string().optional(),
});
export type OAuthClientCreated = z.infer<typeof oauthClientCreatedSchema>;

export const oauthClientSecretRotatedSchema = z.object({
  /** Only present for confidential clients. */
  clientSecret: z.string().optional(),
});
export type OAuthClientSecretRotated = z.infer<
  typeof oauthClientSecretRotatedSchema
>;

/** RFC 6749 §4.1.1 authorization request, as the consent page forwards it. */
export const oauthAuthorizationRequestSchema = z.object({
  response_type: z.string(),
  client_id: z.string().min(1),
  redirect_uri: z.string().min(1),
  scope: z.string().optional(),
  state: z.string().max(1024).optional(),
  nonce: z.string().max(1024).optional(),
  code_challenge: z.string().optional(),
  code_challenge_method: z.string().optional(),
});
export type OAuthAuthorizationRequest = z.infer<
  typeof oauthAuthorizationRequestSchema
>;

export const oauthPublicClientSchema = oauthClientSchema.pick({
  id: true,
  name: true,
  firstParty: true,
  clientUri: true,
  logoUri: true,
});

export const oauthAuthorizationInfoSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('consent'),
    client: oauthPublicClientSchema,
    scopes: z.array(z.string()),
    /** Every requested scope is already granted: skip the prompt. */
    autoApprove: z.boolean(),
  }),
  /** The request is invalid but the redirect URI is trusted (RFC 6749 §4.1.2.1). */
  z.object({ status: z.literal('redirect'), redirectUrl: z.string() }),
]);
export type OAuthAuthorizationInfo = z.infer<
  typeof oauthAuthorizationInfoSchema
>;

export const oauthAuthorizationDecisionSchema =
  oauthAuthorizationRequestSchema.extend({ approve: z.boolean() });
export type OAuthAuthorizationDecision = z.infer<
  typeof oauthAuthorizationDecisionSchema
>;

export const oauthRedirectSchema = z.object({ redirectUrl: z.string() });
export type OAuthRedirect = z.infer<typeof oauthRedirectSchema>;

export const oauthGrantSchema = z.object({
  clientId: z.string(),
  clientName: z.string(),
  scopes: z.array(z.string()),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type OAuthGrant = z.infer<typeof oauthGrantSchema>;

/** RFC 7591 §2 client metadata (the subset OpenPeeps honors). */
export const oauthClientRegistrationSchema = z.object({
  redirect_uris: redirectUrisSchema,
  client_name: z.string().trim().min(1).max(100).optional(),
  client_uri: z.url().optional(),
  logo_uri: z.url().optional(),
  token_endpoint_auth_method: z
    .enum(['none', 'client_secret_basic', 'client_secret_post'])
    .default('none'),
  grant_types: z
    .array(z.enum(['authorization_code', 'refresh_token']))
    .optional(),
  response_types: z.array(z.literal('code')).optional(),
});
export type OAuthClientRegistration = z.input<
  typeof oauthClientRegistrationSchema
>;

/** RFC 6749 §5.1 successful token response. */
export const oauthTokenResponseSchema = z.object({
  access_token: z.string(),
  token_type: z.literal('Bearer'),
  expires_in: z.number(),
  scope: z.string(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
});
export type OAuthTokenResponse = z.infer<typeof oauthTokenResponseSchema>;
