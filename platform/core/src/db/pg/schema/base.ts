import { sql } from 'drizzle-orm';
import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

export const tsvector = customType<{ data: string }>({
  dataType: () => 'tsvector',
});

/** Qwen3-Embedding width used by the platform AI data plane. */
export const EMBEDDING_DIMENSIONS = 2560;

/**
 * pgvector half-precision column. `vector` caps HNSW indexes at 2000 dims,
 * but `halfvec` allows 4000 — so the 2560-dim space keeps ANN (and saves
 * 50% storage) instead of degrading to a sequential cosine scan.
 */
export const halfvec = customType<{ data: number[]; driverData: string }>({
  dataType: () => `halfvec(${EMBEDDING_DIMENSIONS})`,
  toDriver: (value) => `[${value.join(',')}]`,
  fromDriver: (value) => {
    if (Array.isArray(value)) return value.map(Number);
    const text = String(value).replace(/^\[|\]$/g, '');
    return text ? text.split(',').map(Number) : [];
  },
});

export const idColumn = () => uuid('id').primaryKey();

export const modelTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
  deletedAt: timestamp('deleted_at', { withTimezone: true, mode: 'string' }),
};

export const edgeTimestamps = {
  createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updatedAt: timestamp('updated_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
};
