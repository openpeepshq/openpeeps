import { and, eq, gte, isNull, lt, sql, type SQL } from 'drizzle-orm';
import { checkCapabilities, mergeCapabilities } from '@openpeeps/common/lib';
import type { OMFilter } from './queryTypes';
import {
  asTable,
  documentRegistry,
  edgeRegistry,
  getCollectionConfig,
  parseDocRef,
  type PgTable,
} from './registry';

const getPath = (obj: Record<string, unknown>, path: string): unknown => {
  const parts = path.replace(/\[['"]?(\w+)['"]?\]/g, '.$1').split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
};

const normalizeAqlExpression = (expression: string): string =>
  expression
    .replace(/DOC\./g, 'doc.')
    .replace(/\band\b/gi, '&&')
    .replace(/\bor\b/gi, '||')
    .replace(/==/g, '===')
    .replace(/!=/g, '!==')
    .replace(/DATE_TIMESTAMP\(([^)]+)\)/g, 'new Date($1).getTime()')
    .replace(/LENGTH\(([^)]+)\)/g, '(Array.isArray($1) ? $1.length : 0)')
    .replace(/ALLPEEP::CHECK_CAPABILITIES\(/g, 'CHECK_CAPABILITIES(')
    .replace(/ALLPEEP::MERGE_CAPABILITIES\(/g, 'MERGE_CAPABILITIES(');

export const evaluateStringFilter = (
  doc: Record<string, unknown>,
  expression: string,
): boolean => {
  if (!expression) return true;
  try {
    const fn = new Function(
      'doc',
      'CHECK_CAPABILITIES',
      'MERGE_CAPABILITIES',
      `return ${normalizeAqlExpression(expression)};`,
    );
    return Boolean(fn(doc, checkCapabilities, mergeCapabilities));
  } catch {
    return false;
  }
};

export const evaluateFilter = (
  doc: Record<string, unknown>,
  filter?: OMFilter<Record<string, unknown>>,
): boolean => {
  if (!filter) return true;
  if (typeof filter === 'string') {
    return evaluateStringFilter(doc, filter);
  }
  if ('operator' in filter) {
    const preds = filter.predicates.map((p) => evaluateFilter(doc, p));
    return filter.operator === '&&'
      ? preds.every(Boolean)
      : preds.some(Boolean);
  }
  if ('matches' in filter) {
    const matches = Array.isArray(filter.matches)
      ? filter.matches
      : [filter.matches];
    return matches.some((match) =>
      Object.entries(match).every(([key, value]) => {
        const field = key === '_key' ? 'id' : key;
        if (field === '_from' || field === '_to') {
          const parsed =
            typeof value === 'string' ? parseDocRef(value) : undefined;
          if (parsed) {
            const docRef = getPath(doc, field) as string | undefined;
            const docParsed = docRef ? parseDocRef(docRef) : undefined;
            return docParsed?.id === parsed.id;
          }
        }
        return getPath(doc, field) === value;
      }),
    );
  }
  return true;
};

const bodyColumn = (table: Record<string, unknown>) => table.body as SQL;

const matchToSql = (
  collection: string,
  table: PgTable,
  match: Record<string, unknown>,
): SQL | undefined => {
  const t = asTable(table);
  const conditions: SQL[] = [];

  for (const [key, value] of Object.entries(match)) {
    if (key === '_key') {
      conditions.push(eq(t.id as never, value as string));
      continue;
    }
    if (key === '_from' && typeof value === 'string') {
      const parsed = parseDocRef(value);
      if (parsed) conditions.push(eq(t.fromId as never, parsed.id));
      continue;
    }
    if (key === '_to' && typeof value === 'string') {
      const parsed = parseDocRef(value);
      if (parsed) conditions.push(eq(t.toId as never, parsed.id));
      continue;
    }

    const config = getCollectionConfig(collection);
    if (!config || config.kind !== 'document') continue;

    const scalarColumns: Record<string, string[]> = {
      accounts: ['email', 'passwordHash', 'emailValidated', 'guest'],
      profiles: ['handle', 'type', 'activityPubDomain'],
      posts: ['type', 'visibility', 'creatorId'],
      groups: ['handle'],
      hashtags: ['name'],
      roles: ['key', 'isDefault'],
      notifications: ['profileId'],
      jamEvents: ['postId', 'type'],
      processingStats: ['filetype', 'filesize'],
      profileSettings: ['profileId'],
      inviteLinks: ['slug'],
    };

    const scalars = scalarColumns[collection];
    if (scalars?.includes(key)) {
      conditions.push(eq(t[key] as never, value as never));
    } else if (t.body) {
      conditions.push(
        sql`${bodyColumn(t)} @> ${JSON.stringify({ [key]: value })}::jsonb`,
      );
    }
  }

  return conditions.length ? and(...conditions) : undefined;
};

export const filtersToSql = (
  collection: string,
  table: PgTable,
  filters: OMFilter<Record<string, unknown>>[] | undefined,
  softDelete: boolean | undefined,
): SQL | undefined => {
  const t = asTable(table);
  const conditions: SQL[] = [];

  if (softDelete !== false && t.deletedAt) {
    conditions.push(isNull(t.deletedAt as never));
  }

  for (const filter of filters ?? []) {
    if (typeof filter === 'string') continue;
    if ('operator' in filter) continue;
    if ('matches' in filter) {
      const matches = Array.isArray(filter.matches)
        ? filter.matches
        : [filter.matches];
      for (const match of matches) {
        const sqlMatch = matchToSql(collection, table, match);
        if (sqlMatch) conditions.push(sqlMatch);
      }
    }
  }

  return conditions.length ? and(...conditions) : undefined;
};

export const applyDateRangeToEdgeSql = (
  table: PgTable,
  filter?: string,
): SQL | undefined => {
  if (!filter) return undefined;
  const t = asTable(table);
  const range = filter.match(
    /DATE_TIMESTAMP\(DOC\.createdAt\) >= (\d+).*DATE_TIMESTAMP\(DOC\.createdAt\) < (\d+)/,
  );
  if (range) {
    return and(
      gte(t.createdAt as never, new Date(Number(range[1])).toISOString()),
      lt(t.createdAt as never, new Date(Number(range[2])).toISOString()),
    );
  }
  const startOnly = filter.match(/DATE_TIMESTAMP\(DOC\.createdAt\) >= (\d+)/);
  if (startOnly) {
    return gte(
      t.createdAt as never,
      new Date(Number(startOnly[1])).toISOString(),
    );
  }
  const endOnly = filter.match(/DATE_TIMESTAMP\(DOC\.createdAt\) < (\d+)/);
  if (endOnly) {
    return lt(t.createdAt as never, new Date(Number(endOnly[1])).toISOString());
  }
  return undefined;
};

export const applyPostFilters = <O extends object>(
  docs: O[],
  filters: OMFilter<O>[] | undefined,
  defaultFilter?: OMFilter<O>,
): O[] => {
  const allFilters = [
    ...(defaultFilter ? [defaultFilter] : []),
    ...(filters ?? []),
  ];
  return docs.filter((doc) =>
    allFilters.every((f) =>
      evaluateFilter(
        doc as Record<string, unknown>,
        f as OMFilter<Record<string, unknown>>,
      ),
    ),
  );
};

export const applySort = <O extends object>(
  docs: O[],
  sort?: [string, 'ASC' | 'DESC' | undefined][],
): O[] => {
  if (!sort?.length) return docs;
  return [...docs].sort((a, b) => {
    for (const [expr, direction] of sort) {
      const path = expr.replace(/^DOC\./, '');
      const av = getPath(a as Record<string, unknown>, path);
      const bv = getPath(b as Record<string, unknown>, path);
      if (av === bv) continue;
      const cmp =
        av == null ? -1 : bv == null ? 1 : av < bv ? -1 : av > bv ? 1 : 0;
      return direction === 'DESC' ? -cmp : cmp;
    }
    return 0;
  });
};

export const applyLimit = <O>(
  docs: O[],
  limit?: number | [number, number],
): O[] => {
  if (!limit) return docs;
  if (typeof limit === 'number') return docs.slice(0, limit);
  const [offset, count] = limit;
  return docs.slice(offset, offset + count);
};

export const getEdgeTable = (edgeCollection: string): PgTable => {
  const config = edgeRegistry[edgeCollection];
  if (!config) {
    throw new Error(`Unknown edge collection: ${edgeCollection}`);
  }
  return config.table;
};
