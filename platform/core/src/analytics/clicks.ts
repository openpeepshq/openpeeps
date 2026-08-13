import { and, count, desc, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { formatISO, startOfDay } from 'date-fns';
import type {
  AnalyticsClickEvent,
  AnalyticsClickKind,
  AnalyticsClicks,
  AnalyticsDateQuery,
} from '@openpeepshq/common/types';
import { logger } from '../log';
import { database } from '../db';
import { analyticsDailyClicks } from '../db/pg/schema/analytics';
import { resolveAnalyticsRange } from './dateRange';

const log = logger('app:analytics:clicks');

export const MAX_CLICK_TARGET_LENGTH = 512;
export const MAX_DISTINCT_CLICK_TARGETS_PER_DAY = 5_000;
export const TOP_CLICKS_LIMIT = 25;

const SKIP_PAGE_PREFIXES = [
  '/admin',
  '/api',
  '/login',
  '/signup',
  '/register',
  '/auth',
  '/oauth',
  '/sso',
  '/health',
  '/_db',
];

const todayString = () =>
  formatISO(startOfDay(new Date()), { representation: 'date' });

const skipPagePath = (pathname: string): boolean =>
  SKIP_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

const truncateCheck = (value: string): string | null =>
  value.length === 0 || value.length > MAX_CLICK_TARGET_LENGTH ? null : value;

/** Pathname only; drop query/hash; skip admin/api/auth routes. */
export const normalizePageTarget = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  let pathname: string;
  try {
    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
      const url = new URL(trimmed);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        return null;
      }
      pathname = url.pathname || '/';
    } else {
      pathname = new URL(trimmed, 'https://openpeeps.invalid').pathname || '/';
    }
  } catch {
    return null;
  }

  if (!pathname.startsWith('/')) return null;
  if (skipPagePath(pathname)) return null;
  return truncateCheck(pathname);
};

/** origin + pathname, lowercase host, no query/hash. http(s) only. */
export const normalizeLinkTarget = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^(javascript|data|mailto|tel|blob):/i.test(trimmed)) return null;

  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    const host = url.hostname.toLowerCase();
    const port = url.port ? `:${url.port}` : '';
    const path = url.pathname || '/';
    return truncateCheck(`${url.protocol}//${host}${port}${path}`);
  } catch {
    return null;
  }
};

export const normalizeClickEvent = (
  event: AnalyticsClickEvent,
): { kind: AnalyticsClickKind; target: string } | null => {
  if (event.kind === 'page') {
    const target = normalizePageTarget(event.target);
    return target ? { kind: 'page', target } : null;
  }
  const target = normalizeLinkTarget(event.target);
  return target ? { kind: 'link', target } : null;
};

export const tallyNormalizedClicks = (
  events: AnalyticsClickEvent[],
): Array<{ kind: AnalyticsClickKind; target: string; clicks: number }> => {
  const counts = new Map<
    string,
    { kind: AnalyticsClickKind; target: string }
  >();
  const tallies = new Map<string, number>();
  for (const event of events) {
    const normalized = normalizeClickEvent(event);
    if (!normalized) continue;
    const key = `${normalized.kind}\0${normalized.target}`;
    counts.set(key, normalized);
    tallies.set(key, (tallies.get(key) ?? 0) + 1);
  }
  return [...counts.entries()].map(([key, { kind, target }]) => ({
    kind,
    target,
    clicks: tallies.get(key) ?? 0,
  }));
};

const incrementExisting = async (
  day: string,
  kind: AnalyticsClickKind,
  target: string,
  clicks: number,
) => {
  const db = await database();
  await db
    .update(analyticsDailyClicks)
    .set({
      clicks: sql`${analyticsDailyClicks.clicks} + ${clicks}`,
    })
    .where(
      and(
        eq(analyticsDailyClicks.day, day),
        eq(analyticsDailyClicks.kind, kind),
        eq(analyticsDailyClicks.target, target),
      ),
    );
};

const upsertClick = async (
  day: string,
  kind: AnalyticsClickKind,
  target: string,
  clicks: number,
) => {
  const db = await database();
  await db
    .insert(analyticsDailyClicks)
    .values({ day, kind, target, clicks })
    .onConflictDoUpdate({
      target: [
        analyticsDailyClicks.day,
        analyticsDailyClicks.kind,
        analyticsDailyClicks.target,
      ],
      set: { clicks: sql`${analyticsDailyClicks.clicks} + ${clicks}` },
    });
};

const distinctTargetCount = async (day: string): Promise<number> => {
  const db = await database();
  const rows = await db
    .select({ n: count() })
    .from(analyticsDailyClicks)
    .where(eq(analyticsDailyClicks.day, day));
  return Number(rows[0]?.n ?? 0);
};

/** Live increment. Does not accept or persist a profile id. */
export const recordClickEvents = async (
  events: AnalyticsClickEvent[],
): Promise<void> => {
  const tallied = tallyNormalizedClicks(events);
  if (tallied.length === 0) return;

  const day = todayString();
  let distinct = await distinctTargetCount(day);
  let loggedCap = false;

  for (const row of tallied) {
    if (distinct >= MAX_DISTINCT_CLICK_TARGETS_PER_DAY) {
      if (!loggedCap) {
        log.warn(
          'Dropping new click targets; day %s already has %s distinct targets',
          day,
          distinct,
        );
        loggedCap = true;
      }
      await incrementExisting(day, row.kind, row.target, row.clicks);
      continue;
    }
    await upsertClick(day, row.kind, row.target, row.clicks);
    distinct += 1;
  }
};

const topClicks = async (
  from: string,
  to: string,
  kind: AnalyticsClickKind,
): Promise<Array<{ target: string; clicks: number }>> => {
  const db = await database();
  const rows = await db
    .select({
      target: analyticsDailyClicks.target,
      clicks: sum(analyticsDailyClicks.clicks),
    })
    .from(analyticsDailyClicks)
    .where(
      and(
        gte(analyticsDailyClicks.day, from),
        lte(analyticsDailyClicks.day, to),
        eq(analyticsDailyClicks.kind, kind),
      ),
    )
    .groupBy(analyticsDailyClicks.target)
    .orderBy(desc(sum(analyticsDailyClicks.clicks)))
    .limit(TOP_CLICKS_LIMIT);

  return rows.map((row) => ({
    target: row.target,
    clicks: Number(row.clicks ?? 0),
  }));
};

export const getAnalyticsClicks = async (
  query: AnalyticsDateQuery = {},
): Promise<AnalyticsClicks> => {
  const range = resolveAnalyticsRange(query);
  const [pages, links] = await Promise.all([
    topClicks(range.from, range.to, 'page'),
    topClicks(range.from, range.to, 'link'),
  ]);
  return {
    range: {
      from: range.from,
      to: range.to,
      previousFrom: range.previousFrom,
      previousTo: range.previousTo,
      preset: range.preset,
      compiledAt: null,
    },
    pages,
    links,
  };
};
