import type { Base, Model } from '@openpeeps/common/types';

export type RowTimestamps = {
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
};

export const rowToModel = <T extends object>(
  id: string,
  data: T,
  timestamps: RowTimestamps,
): Model<T> => ({
  id,
  ...data,
  createdAt: timestamps.createdAt,
  updatedAt: timestamps.updatedAt,
  ...(timestamps.deletedAt ? { deletedAt: timestamps.deletedAt } : {}),
});

export const modelTimestampsFromRow = (row: RowTimestamps) => ({
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
  deletedAt: row.deletedAt ?? undefined,
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
