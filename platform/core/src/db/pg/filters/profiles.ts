import { eq, gt, isNull, ne, notInArray, or, sql } from 'drizzle-orm';
import { profiles } from '../schema/documents';
import { profileActivityScoreExpr } from '../queries/activity';
import { pgSql, type SqlFilter } from './types';

export const profileFilters = {
  notGuest: (): SqlFilter => pgSql(ne(profiles.type, 'guest')),

  type: (type: string): SqlFilter => pgSql(eq(profiles.type, type)),

  notIdIn: (ids: string[]): SqlFilter | undefined =>
    ids.length ? pgSql(notInArray(profiles.id, ids)) : undefined,

  activityScorePositive: (start?: Date, end?: Date): SqlFilter =>
    pgSql(gt(profileActivityScoreExpr(profiles, { start, end }), 0)),

  // Writer contract: only body->>'discoverable' = 'false' hides a profile;
  // an absent flag stays listed. That is the single canonical encoding — the
  // profile screens persist it via PATCH /profiles/current, and
  // loadLocalActor (federation/actors.ts) projects the same boolean onto the
  // ActivityPub actor.
  discoverable: (): SqlFilter =>
    pgSql(
      or(
        isNull(sql`${profiles.body}->>'discoverable'`)!,
        sql`${profiles.body}->>'discoverable' <> 'false'`,
      )!,
    ),
};
