import { z } from 'zod';
import { jsonSchema, type Json } from './utils';

export const explorerColumnSchema = z.object({
  name: z.string(),
  dataType: z.string(),
  primaryKey: z.boolean(),
  notNull: z.boolean(),
});

export type ExplorerColumn = z.infer<typeof explorerColumnSchema>;

export const explorerTableSchema = z.object({
  name: z.string(),
  columns: z.array(explorerColumnSchema),
});

export type ExplorerTable = z.infer<typeof explorerTableSchema>;

export const explorerTablesResponseSchema = z.object({
  tables: z.array(explorerTableSchema),
});

export type ExplorerTablesResponse = z.infer<
  typeof explorerTablesResponseSchema
>;

export const explorerRowsResponseSchema = z.object({
  columns: z.array(z.string()),
  // Use jsonSchema (not z.unknown / z.lazy) so OpenAPI generation stays safe.
  rows: z.array(z.record(z.string(), jsonSchema)),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type ExplorerRowsResponse = z.infer<typeof explorerRowsResponseSchema>;

/** JSON-compatible values for request bodies (matches fetch-client Serializable). */
export type ExplorerJson = Json;

export const explorerUpdateRowInputSchema = z.object({
  primaryKey: z.record(z.string(), jsonSchema),
  patch: z.record(z.string(), jsonSchema),
});

export type ExplorerUpdateRowInput = z.infer<
  typeof explorerUpdateRowInputSchema
>;

export const explorerUpdateRowResponseSchema = z.object({
  row: z.record(z.string(), jsonSchema),
});

export type ExplorerUpdateRowResponse = z.infer<
  typeof explorerUpdateRowResponseSchema
>;

export const explorerSqlInputSchema = z.object({
  statement: z.string().min(1),
  /** Max rows to return (capped server-side). Omit for the default cap. */
  limit: z.number().int().positive().max(10_000).optional(),
});

export type ExplorerSqlInput = z.infer<typeof explorerSqlInputSchema>;

export const explorerSqlResponseSchema = z.object({
  columns: z.array(z.string()),
  rows: z.array(z.record(z.string(), jsonSchema)),
  rowCount: z.number(),
  command: z.string(),
});

export type ExplorerSqlResponse = z.infer<typeof explorerSqlResponseSchema>;
