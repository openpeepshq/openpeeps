import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from 'drizzle-orm';
import { checkCapabilities, mergeCapabilities } from '@openpeeps/common/lib';
import { isSqlFilter } from '../filters';
import {
  groupLastPostAtExpr,
  postActivityScoreExpr,
  postReplyCountExpr,
  profileActivityScoreExpr,
} from '../queries/activity';
import type {
  ActivityWindow,
  Limit,
  ObjectSort,
  OMFilter,
  PgFilter,
} from './queryTypes';
import {
  asTable,
  edgeRegistry,
  getCollectionConfig,
  getTableForCollection,
  parseDocRef,
  type PgTable,
} from './registry';

const SCALAR_COLUMNS: Record<string, string[]> = {
  accounts: ['email', 'passwordHash', 'emailValidated', 'guest'],
  profiles: ['handle', 'type', 'activityPubDomain'],
  posts: ['type', 'visibility', 'creatorId'],
  groups: ['handle'],
  hashtags: ['name'],
  roles: ['key', 'isDefault'],
  notifications: ['profileId'],
  jamEvents: ['postId'],
  processingStats: ['filetype', 'filesize'],
  profileSettings: ['profileId'],
  inviteLinks: ['slug'],
};

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
    .replace(/LENGTH\(([^)]+)\)/g, '(Array.isArray($1) ? $1.length : 0)');

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
  filter?: PgFilter<Record<string, unknown>>,
): boolean => {
  if (!filter) return true;
  if (isSqlFilter(filter)) return true;
  if (typeof filter === 'string') {
    return evaluateStringFilter(doc, filter);
  }
  if ('operator' in filter) {
    const preds = filter.predicates.map((p) => {
      if (isSqlFilter(p)) return true;
      return evaluateFilter(doc, p);
    });
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

const postsReplyCountSql = (table: PgTable): SQL => postReplyCountExpr(table);

const docFieldSql = (
  collection: string,
  table: PgTable,
  fieldPath: string,
): SQL | undefined => {
  const t = asTable(table);
  if (fieldPath === '_key' || fieldPath === 'id') return sql`${t.id}`;
  if (fieldPath === 'createdAt' && t.createdAt) return sql`${t.createdAt}`;
  if (fieldPath === 'updatedAt' && t.updatedAt) return sql`${t.updatedAt}`;
  if (fieldPath === '_from' && t.fromId) return sql`${t.fromId}`;
  if (fieldPath === '_to' && t.toId) return sql`${t.toId}`;

  const scalars = SCALAR_COLUMNS[collection];
  if (scalars?.includes(fieldPath)) return sql`${t[fieldPath]}`;

  let jsonPath = fieldPath;
  if (collection === 'posts' && jsonPath.startsWith('data.')) {
    jsonPath = jsonPath.slice(5);
  }

  if (!t.body) return undefined;

  const parts = jsonPath.split('.');
  if (parts.length === 1) {
    return sql`${bodyColumn(t)}->>${parts[0]}`;
  }
  const head = parts
    .slice(0, -1)
    .map((part) => `'${part}'`)
    .join('->');
  return sql`${bodyColumn(t)}->${sql.raw(head)}->>${parts[parts.length - 1]}`;
};

const docFieldJsonSql = (
  collection: string,
  table: PgTable,
  fieldPath: string,
): SQL | undefined => {
  const t = asTable(table);
  let jsonPath = fieldPath;
  if (collection === 'posts' && jsonPath.startsWith('data.')) {
    jsonPath = jsonPath.slice(5);
  }
  if (!t.body) return undefined;
  const parts = jsonPath.split('.');
  if (parts.length === 1) {
    return sql`${bodyColumn(t)}->${parts[0]}`;
  }
  const path = parts.map((part) => `'${part}'`).join('->');
  return sql`${bodyColumn(t)}->${sql.raw(path)}`;
};

const parseLiteral = (raw: string): string | number | boolean | null => {
  const trimmed = raw.trim();
  if (trimmed === 'null') return null;
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const quoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"));
  if (quoted) return trimmed.slice(1, -1);
  return trimmed;
};

const compareSql = (
  left: SQL,
  op: string,
  value: string | number | boolean | null,
): SQL | undefined => {
  switch (op) {
    case '==':
      return value === null ? sql`${left} IS NULL` : eq(left, value);
    case '!=':
      return value === null ? sql`${left} IS NOT NULL` : ne(left, value);
    case '>':
      return gt(left, value as never);
    case '>=':
      return gte(left, value as never);
    case '<':
      return lt(left, value as never);
    case '<=':
      return lte(left, value as never);
    default:
      return undefined;
  }
};

const unwrapParens = (expression: string): string => {
  let expr = expression.trim();
  while (expr.startsWith('(') && expr.endsWith(')')) {
    let depth = 0;
    let closed = true;
    for (let i = 0; i < expr.length; i++) {
      if (expr[i] === '(') depth++;
      if (expr[i] === ')') depth--;
      if (depth === 0 && i < expr.length - 1) {
        closed = false;
        break;
      }
    }
    if (!closed) break;
    expr = expr.slice(1, -1).trim();
  }
  return expr;
};

const splitTopLevel = (expression: string, separator: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && expression.startsWith(separator, i)) {
      parts.push(expression.slice(start, i).trim());
      start = i + separator.length;
      i += separator.length - 1;
    }
  }
  parts.push(expression.slice(start).trim());
  return parts.filter(Boolean);
};

const createdAtRangeSql = (
  table: PgTable,
  expression: string,
): SQL | undefined => {
  const t = asTable(table);
  const range = expression.match(
    /DATE_TIMESTAMP\(DOC\.createdAt\)\s*>=\s*(\d+).*DATE_TIMESTAMP\(DOC\.createdAt\)\s*<\s*(\d+)/,
  );
  if (range) {
    return and(
      gte(t.createdAt as never, new Date(Number(range[1])).toISOString()),
      lt(t.createdAt as never, new Date(Number(range[2])).toISOString()),
    );
  }
  const startOnly = expression.match(
    /DATE_TIMESTAMP\(DOC\.createdAt\)\s*>=\s*(\d+)/,
  );
  if (startOnly) {
    return gte(
      t.createdAt as never,
      new Date(Number(startOnly[1])).toISOString(),
    );
  }
  const endOnly = expression.match(
    /DATE_TIMESTAMP\(DOC\.createdAt\)\s*<\s*(\d+)/,
  );
  if (endOnly) {
    return lt(t.createdAt as never, new Date(Number(endOnly[1])).toISOString());
  }
  return undefined;
};

const eventFilterSql = (
  collection: string,
  table: PgTable,
  expression: string,
): SQL | undefined => {
  if (collection !== 'posts') return undefined;
  const t = asTable(table);
  const body = bodyColumn(t);

  const past = expression.match(
    /^\(DOC\.data\.end \|\| DOC\.data\.start\)\s*<\s*['"]([^'"]+)['"]$/,
  );
  if (past) {
    return sql`COALESCE(${body}->>'end', ${body}->>'start') < ${past[1]}`;
  }

  const upcoming = expression.match(
    /^\(\(DOC\.data\.start\s*>\s*['"]([^'"]+)['"]\)\s*\|\|\s*\(DOC\.data\.end && DOC\.data\.end\s*>\s*['"]\1['"]\)\)$/,
  );
  if (upcoming) {
    const now = upcoming[1];
    return or(
      sql`${body}->>'start' > ${now}`,
      and(sql`${body}->'end' IS NOT NULL`, sql`${body}->>'end' > ${now}`),
    );
  }

  const current = expression.match(
    /^DOC\.data\.start\s*<=\s*['"]([^'"]+)['"]\s*&&\s*\(!DOC\.data\.end \|\| DOC\.data\.end\s*>=\s*['"]\1['"]\)$/,
  );
  if (current) {
    const now = current[1];
    return and(
      sql`${body}->>'start' <= ${now}`,
      or(sql`${body}->'end' IS NULL`, sql`${body}->>'end' >= ${now}`),
    );
  }

  return undefined;
};

const singleStringFilterToSql = (
  collection: string,
  table: PgTable,
  expression: string,
): SQL | undefined => {
  const expr = unwrapParens(expression);
  if (!expr || expr.includes(' FOR ')) {
    return undefined;
  }

  const dateRange = createdAtRangeSql(table, expr);
  if (dateRange) return dateRange;

  const eventFilter = eventFilterSql(collection, table, expr);
  if (eventFilter) return eventFilter;

  const negation = expr.match(/^!DOC\.([a-zA-Z0-9_.]+)$/);
  if (negation) {
    const fieldPath = negation[1];
    if (fieldPath === 'seen' || fieldPath === 'read') {
      const field = docFieldSql(collection, table, fieldPath);
      return field ? sql`NOT COALESCE((${field})::boolean, false)` : undefined;
    }
    const jsonField = docFieldJsonSql(collection, table, fieldPath);
    return jsonField ? sql`${jsonField} IS NULL` : undefined;
  }

  const replyCountMatch = expr.match(
    /^DOC\.replyCount\s*(==|!=|>=|<=|>|<)\s*(\d+)$/,
  );
  if (replyCountMatch && collection === 'posts') {
    const countExpr = postsReplyCountSql(table);
    return compareSql(
      countExpr,
      replyCountMatch[1],
      Number(replyCountMatch[2]),
    );
  }

  const comparison = expr.match(
    /^DOC\.([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|>|<)\s*(.+)$/,
  );
  if (comparison) {
    const [, fieldPath, op, rawValue] = comparison;
    const value = parseLiteral(rawValue);
    if (fieldPath === 'replyCount' && collection === 'posts') {
      if (typeof value !== 'number') return undefined;
      return compareSql(postsReplyCountSql(table), op, value);
    }
    if (op === '!=' && rawValue.trim() === 'null') {
      const jsonField = docFieldJsonSql(collection, table, fieldPath);
      return jsonField ? sql`${jsonField} IS NOT NULL` : undefined;
    }
    if (op === '==' && rawValue.trim() === 'null') {
      const jsonField = docFieldJsonSql(collection, table, fieldPath);
      return jsonField ? sql`${jsonField} IS NULL` : undefined;
    }
    const field = docFieldSql(collection, table, fieldPath);
    if (!field) return undefined;
    if (fieldPath === 'seen' || fieldPath === 'read') {
      if (op === '!=' && value === null) {
        return sql`COALESCE((${field})::boolean, false) = true`;
      }
    }
    return compareSql(field, op, value);
  }

  const keyCompare = expr.match(/^DOC\._key\s*(<|>)\s*['"]([^'"]+)['"]$/);
  if (keyCompare) {
    const t = asTable(table);
    return keyCompare[1] === '<'
      ? lt(t.id as never, keyCompare[2])
      : gt(t.id as never, keyCompare[2]);
  }

  const truthyField = expr.match(/^DOC\.([a-zA-Z0-9_.]+)$/);
  if (truthyField) {
    const jsonField = docFieldJsonSql(collection, table, truthyField[1]);
    return jsonField ? sql`${jsonField} IS NOT NULL` : undefined;
  }

  const coalesceCompare = expr.match(
    /^\(DOC\.([a-zA-Z0-9_.]+)\s*\|\|\s*DOC\.([a-zA-Z0-9_.]+)\)\s*(<|>|<=|>=)\s*['"]([^'"]+)['"]$/,
  );
  if (coalesceCompare) {
    const left = docFieldSql(collection, table, coalesceCompare[1]);
    const right = docFieldSql(collection, table, coalesceCompare[2]);
    if (!left || !right) return undefined;
    return compareSql(
      sql`COALESCE(${left}, ${right})`,
      coalesceCompare[3],
      coalesceCompare[4],
    );
  }

  const fieldTruthyAndCompare = expr.match(
    /^DOC\.([a-zA-Z0-9_.]+)\s*&&\s*DOC\.([a-zA-Z0-9_.]+)\s*(>|>=|<|<=|==|!=)\s*(.+)$/,
  );
  if (
    fieldTruthyAndCompare &&
    fieldTruthyAndCompare[1] === fieldTruthyAndCompare[2]
  ) {
    const [, fieldPath, , op, rawValue] = fieldTruthyAndCompare;
    const jsonField = docFieldJsonSql(collection, table, fieldPath);
    const field = docFieldSql(collection, table, fieldPath);
    if (!jsonField || !field) return undefined;
    const value = parseLiteral(rawValue);
    const compare = compareSql(field, op, value);
    if (!compare) return undefined;
    return and(sql`${jsonField} IS NOT NULL`, compare);
  }

  return undefined;
};

export const stringFilterToSql = (
  collection: string,
  table: PgTable,
  expression: string,
): SQL | undefined => {
  const expr = unwrapParens(expression);
  if (!expr) return undefined;

  if (expr.includes('||')) {
    const parts = splitTopLevel(expr, '||');
    const sqlParts = parts.map((part) =>
      stringFilterToSql(collection, table, part),
    );
    if (sqlParts.some((part) => !part)) return undefined;
    return or(...(sqlParts as SQL[]));
  }

  if (expr.includes('&&')) {
    const parts = splitTopLevel(expr, '&&');
    const sqlParts = parts.map((part) =>
      stringFilterToSql(collection, table, part),
    );
    if (sqlParts.some((part) => !part)) return undefined;
    return and(...(sqlParts as SQL[]));
  }

  return singleStringFilterToSql(collection, table, expr);
};

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
    if (key === 'replyCount' && collection === 'posts') {
      if (typeof value !== 'number') continue;
      const countExpr = postsReplyCountSql(table);
      conditions.push(eq(countExpr, value));
      continue;
    }
    if (key === 'replyToCount' && collection === 'posts') {
      if (typeof value !== 'number') continue;
      const replyToTable = getTableForCollection('replyTo');
      conditions.push(
        sql`(SELECT count(*)::int FROM ${replyToTable} rt WHERE rt.from_id = ${t.id}) = ${value}`,
      );
      continue;
    }
    if (collection === 'hashtags' && key === 'tag') {
      conditions.push(eq(t.name as never, value as never));
      continue;
    }
    if (collection === 'jamEvents' && key === 'jamId') {
      conditions.push(eq(t.postId as never, value as never));
      continue;
    }

    const config = getCollectionConfig(collection);
    if (!config || config.kind !== 'document') continue;

    const scalars = SCALAR_COLUMNS[collection];
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

export const filterToSql = (
  collection: string,
  table: PgTable,
  filter: PgFilter<Record<string, unknown>>,
): SQL | undefined => {
  if (isSqlFilter(filter)) return filter.where;
  if (typeof filter === 'string') {
    return stringFilterToSql(collection, table, filter);
  }
  if ('operator' in filter) {
    const parts = filter.predicates.map((predicate) => {
      if (isSqlFilter(predicate)) return predicate.where;
      return filterToSql(collection, table, predicate);
    });
    if (parts.some((part) => !part)) return undefined;
    return filter.operator === '&&'
      ? and(...(parts as SQL[]))
      : or(...(parts as SQL[]));
  }
  if ('matches' in filter) {
    const matches = Array.isArray(filter.matches)
      ? filter.matches
      : [filter.matches];
    const parts = matches
      .map((match) => matchToSql(collection, table, match))
      .filter(Boolean) as SQL[];
    if (!parts.length) return undefined;
    return parts.length === 1 ? parts[0] : or(...parts);
  }
  return undefined;
};

export const partitionFilters = (
  collection: string,
  table: PgTable,
  filters: PgFilter<Record<string, unknown>>[] | undefined,
  defaultFilter?: PgFilter<Record<string, unknown>>,
  softDelete?: boolean,
): {
  sqlWhere: SQL | undefined;
  postFilters: PgFilter<Record<string, unknown>>[];
} => {
  const t = asTable(table);
  const sqlConditions: SQL[] = [];
  const postFilters: PgFilter<Record<string, unknown>>[] = [];

  if (softDelete !== false && t.deletedAt) {
    sqlConditions.push(isNull(t.deletedAt as never));
  }

  for (const filter of [
    ...(defaultFilter ? [defaultFilter] : []),
    ...(filters ?? []),
  ]) {
    if (isSqlFilter(filter)) {
      sqlConditions.push(filter.where);
      continue;
    }
    const sqlFilter = filterToSql(collection, table, filter);
    if (sqlFilter) sqlConditions.push(sqlFilter);
    else postFilters.push(filter);
  }

  return {
    sqlWhere: sqlConditions.length ? and(...sqlConditions) : undefined,
    postFilters,
  };
};

export const filtersToSql = (
  collection: string,
  table: PgTable,
  filters: PgFilter<Record<string, unknown>>[] | undefined,
  softDelete: boolean | undefined,
): SQL | undefined =>
  partitionFilters(collection, table, filters, undefined, softDelete).sqlWhere;

export const applyDateRangeToEdgeSql = (
  table: PgTable,
  filter?: PgFilter<Record<string, unknown>>,
): SQL | undefined => {
  if (!filter) return undefined;
  if (isSqlFilter(filter)) return filter.where;
  if (typeof filter !== 'string') return undefined;
  return createdAtRangeSql(table, filter);
};

export const sortToSqlOrderBy = (
  collection: string,
  table: PgTable,
  sort?: ObjectSort,
  activityWindow?: ActivityWindow,
): SQL[] | undefined => {
  if (!sort?.length) return undefined;
  const orderBy: SQL[] = [];
  for (const [expr, direction] of sort) {
    const path = expr.replace(/^DOC\./, '');
    const dir = direction === 'DESC' ? desc : asc;

    if (path === 'activityScore') {
      if (collection === 'profiles') {
        orderBy.push(dir(profileActivityScoreExpr(table, activityWindow)));
        continue;
      }
      if (collection === 'posts') {
        orderBy.push(dir(postActivityScoreExpr(table)));
        continue;
      }
    }

    if (path === 'replyCount' && collection === 'posts') {
      orderBy.push(dir(postReplyCountExpr(table)));
      continue;
    }

    if (path === 'lastPostAt' && collection === 'groups') {
      orderBy.push(dir(groupLastPostAtExpr(table)));
      continue;
    }

    const field = docFieldSql(collection, table, path);
    if (!field) return undefined;
    orderBy.push(dir(field));
  }
  return orderBy.length ? orderBy : undefined;
};

export const applyPostFilters = <O extends object>(
  docs: O[],
  filters: PgFilter<O>[] | undefined,
  defaultFilter?: PgFilter<O>,
): O[] => {
  const allFilters = [
    ...(defaultFilter ? [defaultFilter] : []),
    ...(filters ?? []),
  ];
  return docs.filter((doc) =>
    allFilters.every((f) => {
      if (isSqlFilter(f)) return true;
      return evaluateFilter(
        doc as Record<string, unknown>,
        f as PgFilter<Record<string, unknown>>,
      );
    }),
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

export const applyLimit = <O>(docs: O[], limit?: Limit): O[] => {
  if (!limit) return docs;
  if (typeof limit === 'number') return docs.slice(0, limit);
  const [offset, countValue] = limit;
  return docs.slice(offset, offset + countValue);
};

export const applySqlLimit = <
  T extends { limit: (n: number) => T; offset: (n: number) => T },
>(
  query: T,
  limit?: Limit,
): T => {
  if (!limit) return query;
  if (typeof limit === 'number') return query.limit(limit);
  return query.offset(limit[0]).limit(limit[1]);
};

export const getEdgeTable = (edgeCollection: string): PgTable => {
  const config = edgeRegistry[edgeCollection];
  if (!config) {
    throw new Error(`Unknown edge collection: ${edgeCollection}`);
  }
  return config.table;
};
