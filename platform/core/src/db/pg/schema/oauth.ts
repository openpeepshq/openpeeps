import {
  boolean,
  index,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { edgeTimestamps } from './base';

const timestampColumn = (name: string) =>
  timestamp(name, { withTimezone: true, mode: 'string' });

export const oauthClients = pgTable('oauth_clients', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  redirectUris: jsonb('redirect_uris').$type<string[]>().notNull(),
  /** sha256 of the client secret; null for public (PKCE-only) clients. */
  secretHash: varchar('secret_hash', { length: 64 }),
  /** When a dynamic client's secret stops authenticating; null = never. */
  secretExpiresAt: timestampColumn('secret_expires_at'),
  firstParty: boolean('first_party').notNull().default(false),
  dynamic: boolean('dynamic').notNull().default(false),
  clientUri: text('client_uri'),
  logoUri: text('logo_uri'),
  ...edgeTimestamps,
});

/** Remembered consent: the scopes a profile granted a client. */
export const oauthGrants = pgTable(
  'oauth_grants',
  {
    profileId: text('profile_id').notNull(),
    clientId: text('client_id').notNull(),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    ...edgeTimestamps,
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.clientId] }),
    index('oauth_grants_client_idx').on(t.clientId),
  ],
);

export const oauthRefreshTokens = pgTable(
  'oauth_refresh_tokens',
  {
    id: uuid('id').primaryKey(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    /** Every rotation of one login shares a family; reuse revokes it whole. */
    familyId: uuid('family_id').notNull(),
    clientId: text('client_id').notNull(),
    profileId: text('profile_id').notNull(),
    accountId: text('account_id'),
    scopes: jsonb('scopes').$type<string[]>().notNull(),
    /** jti of the access token issued alongside this refresh token. */
    accessTokenId: text('access_token_id'),
    authTime: timestampColumn('auth_time'),
    expiresAt: timestampColumn('expires_at').notNull(),
    usedAt: timestampColumn('used_at'),
    revokedAt: timestampColumn('revoked_at'),
    ...edgeTimestamps,
  },
  (t) => [
    uniqueIndex('oauth_refresh_tokens_token_hash_unique').on(t.tokenHash),
    index('oauth_refresh_tokens_family_idx').on(t.familyId),
    index('oauth_refresh_tokens_profile_client_idx').on(
      t.profileId,
      t.clientId,
    ),
  ],
);
