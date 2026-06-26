import type { Base, Model } from '@openpeeps/common/types';

export type RowTimestamps = {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

/** Postgres returns timestamptz strings with offsets; Zod expects UTC `Z`. */
export const normalizeIsoDatetime = (value: string): string =>
  new Date(value).toISOString();

export const rowToModel = <T extends object>(
  id: string,
  data: T,
  timestamps: RowTimestamps,
): Model<T> => ({
  id,
  ...data,
  createdAt: normalizeIsoDatetime(timestamps.createdAt),
  updatedAt: normalizeIsoDatetime(timestamps.updatedAt),
  ...(timestamps.deletedAt
    ? { deletedAt: normalizeIsoDatetime(timestamps.deletedAt) }
    : {}),
});

export const modelTimestampsFromRow = (row: RowTimestamps) => ({
  createdAt: normalizeIsoDatetime(row.createdAt),
  updatedAt: normalizeIsoDatetime(row.updatedAt),
  deletedAt: row.deletedAt ? normalizeIsoDatetime(row.deletedAt) : undefined,
});

export const notDeleted = <T extends { deletedAt?: string | null }>(
  row: T,
): boolean => !row.deletedAt;

export const nowIso = () => new Date().toISOString();

export type DocumentRow = RowTimestamps & {
  id: string;
  body?: Record<string, unknown>;
};

export const mergeDocumentBody = <T extends object>(
  row: DocumentRow,
  scalars: Partial<T> = {},
): T =>
  ({
    ...((row.body ?? {}) as T),
    ...scalars,
  }) as T;
