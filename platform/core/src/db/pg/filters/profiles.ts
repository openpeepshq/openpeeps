import { eq, gt, ne, sql } from 'drizzle-orm';
import { profiles } from '../schema/documents';
import { profileActivityScoreExpr } from '../queries/activity';
import { pgSql, type SqlFilter } from './types';

export const profileFilters = {
  notGuest: (): SqlFilter => pgSql(ne(profiles.type, 'guest')),

  type: (type: string): SqlFilter => pgSql(eq(profiles.type, type)),

  activityScorePositive: (start?: Date, end?: Date): SqlFilter =>
    pgSql(gt(profileActivityScoreExpr(profiles, { start, end }), 0)),
};
