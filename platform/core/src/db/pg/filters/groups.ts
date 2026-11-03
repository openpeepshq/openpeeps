import { inArray, or, sql, type SQL } from 'drizzle-orm';
import { groups } from '../schema/documents';
import { pgSql, type SqlFilter } from './types';

const audienceOrMembership = (
  audience: SQL,
  membership: SqlFilter | undefined,
): SqlFilter =>
  membership ? pgSql(or(audience, membership.where)!) : pgSql(audience);

export const groupFilters = {
  memberOf: (groupIds: string[]): SqlFilter | undefined =>
    groupIds.length ? pgSql(inArray(groups.id, groupIds)) : undefined,

  publiclyReadable: (): SqlFilter =>
    pgSql(
      sql`${groups.body}->'capabilities'->'none'->'add' ? 'core-groups-read'`,
    ),

  locallyReadable: (): SqlFilter =>
    pgSql(
      sql`${groups.body}->'capabilities'->'local'->'add' ? 'core-groups-read'`,
    ),

  readableByNonLocalViewer: (groupIds: string[]): SqlFilter =>
    audienceOrMembership(
      groupFilters.publiclyReadable().where,
      groupFilters.memberOf(groupIds),
    ),

  readableByLocalViewer: (groupIds: string[]): SqlFilter =>
    audienceOrMembership(
      or(
        groupFilters.publiclyReadable().where,
        groupFilters.locallyReadable().where,
      )!,
      groupFilters.memberOf(groupIds),
    ),
};
