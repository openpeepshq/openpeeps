import type { PgDb } from '../db/pg/client';
import { sub } from 'date-fns';
import { allpeepDb } from '../db';
import { ObjectStats, ObjectStatsWithAll } from '@openpeeps/common/types';

export const creationDateFilter = (start?: Date, end?: Date) =>
  start && end
    ? `(DATE_TIMESTAMP(DOC.createdAt) >= ${start.getTime()} && DATE_TIMESTAMP(DOC.createdAt) < ${end.getTime()})`
    : start
      ? `(DATE_TIMESTAMP(DOC.createdAt) >= ${start.getTime()})`
      : end
        ? `(DATE_TIMESTAMP(DOC.createdAt) < ${end.getTime()})`
        : undefined;

export const pastStats = async (
  fn: (db: PgDb, start?: Date, end?: Date) => Promise<number>,
) =>
  allpeepDb().then(async ({ db }) => ({
    day: await fn(db, sub(new Date(), { days: 1 })),
    week: await fn(db, sub(new Date(), { weeks: 1 })),
    month: await fn(db, sub(new Date(), { months: 1 })),
    quarter: await fn(db, sub(new Date(), { months: 3 })),
    year: await fn(db, sub(new Date(), { years: 1 })),
  }));

export const compileStats = async (
  fn: (db: PgDb, start?: Date, end?: Date) => Promise<number>,
): Promise<ObjectStats> =>
  allpeepDb().then(async ({ db }) => ({
    day: {
      currentPeriod: await fn(db, sub(new Date(), { days: 1 })),
      lastPeriod: await fn(
        db,
        sub(new Date(), { days: 2 }),
        sub(new Date(), { days: 1 }),
      ),
    },
    week: {
      currentPeriod: await fn(db, sub(new Date(), { weeks: 1 })),
      lastPeriod: await fn(
        db,
        sub(new Date(), { weeks: 2 }),
        sub(new Date(), { weeks: 1 }),
      ),
    },
    month: {
      currentPeriod: await fn(db, sub(new Date(), { months: 1 })),
      lastPeriod: await fn(
        db,
        sub(new Date(), { months: 2 }),
        sub(new Date(), { months: 1 }),
      ),
    },
    quarter: {
      currentPeriod: await fn(db, sub(new Date(), { months: 3 })),
      lastPeriod: await fn(
        db,
        sub(new Date(), { months: 6 }),
        sub(new Date(), { months: 3 }),
      ),
    },
    year: {
      currentPeriod: await fn(db, sub(new Date(), { years: 1 })),
      lastPeriod: await fn(
        db,
        sub(new Date(), { years: 2 }),
        sub(new Date(), { years: 1 }),
      ),
    },
  }));

export const compileStatsWithAll = async (
  fn: (db: PgDb, start?: Date, end?: Date) => Promise<number>,
): Promise<ObjectStatsWithAll> =>
  allpeepDb().then(async ({ db }) => ({
    ...(await compileStats(fn)),
    all: await fn(db),
  }));
