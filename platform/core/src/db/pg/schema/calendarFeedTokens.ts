import { index, pgTable, text, uniqueIndex, varchar } from 'drizzle-orm/pg-core';
import { modelTimestamps, idColumn } from './base';

export const calendarFeedTokens = pgTable(
  'calendar_feed_tokens',
  {
    id: idColumn(),
    profileId: text('profile_id').notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull(),
    expiresAt: text('expires_at').notNull(),
    ...modelTimestamps,
  },
  (table) => [
    index('calendar_feed_tokens_profile_idx').on(table.profileId),
    uniqueIndex('calendar_feed_tokens_token_hash_unique').on(table.tokenHash),
  ],
);
