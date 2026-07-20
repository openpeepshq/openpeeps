import {
  and,
  eq,
  gt,
  gte,
  isNull,
  lt,
  lte,
  ne,
  sql,
  type SQL,
} from 'drizzle-orm';
import { asTable, getTableForCollection } from '../map/registry';
import { pgSql, type SqlFilter } from './types';

type TimestampColumn = { createdAt: unknown };

export const createdAtBetween = (
  column: TimestampColumn,
  start?: Date,
  end?: Date,
): SqlFilter | undefined => {
  const parts: SQL[] = [];
  if (start) {
    parts.push(gte(column.createdAt as never, start.toISOString()));
  }
  if (end) {
    parts.push(lt(column.createdAt as never, end.toISOString()));
  }
  return parts.length ? pgSql(and(...parts)!) : undefined;
};

export const beforeId = (column: { id: unknown }, id: string): SqlFilter =>
  pgSql(lt(column.id as never, id));

export const afterId = (column: { id: unknown }, id: string): SqlFilter =>
  pgSql(gt(column.id as never, id));

export const notDeleted = (column: { deletedAt: unknown }): SqlFilter =>
  pgSql(isNull(column.deletedAt as never));

export const compareCount = (
  countExpr: SQL,
  op: '==' | '!=' | '>' | '>=' | '<' | '<=',
  value: number,
): SQL => {
  switch (op) {
    case '==':
      return eq(countExpr, value);
    case '!=':
      return ne(countExpr, value);
    case '>':
      return gt(countExpr, value);
    case '>=':
      return gte(countExpr, value);
    case '<':
      return lt(countExpr, value);
    case '<=':
      return lte(countExpr, value);
  }
};

export const jsonBodyPath = (body: SQL, path: string[]): SQL => {
  if (!path.length) return body;
  if (path.length === 1) {
    return sql`${body}->>${path[0]}`;
  }
  const parents = path
    .slice(0, -1)
    .map((part) => `'${part.replace(/'/g, "''")}'`)
    .join('->');
  const last = path[path.length - 1]!.replace(/'/g, "''");
  return sql`${body}->${sql.raw(parents)}->>${last}`;
};

export const jsonBodyExists = (body: SQL, path: string[]): SQL =>
  sql`${body}->${sql.raw(path.map((part) => `'${part.replace(/'/g, "''")}'`).join('->'))} IS NOT NULL`;

export const documentKeyBefore = (collection: string, id: string): SqlFilter =>
  beforeId(asTable(getTableForCollection(collection)) as { id: unknown }, id);

export const documentKeyAfter = (collection: string, id: string): SqlFilter =>
  afterId(asTable(getTableForCollection(collection)) as { id: unknown }, id);
