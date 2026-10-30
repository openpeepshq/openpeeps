import { inArray, or, sql, type SQL } from 'drizzle-orm';
import { groups } from '../schema/documents';
import { pgSql, type SqlFilter } from './types';

const audienceOrMembership = (audience: SQL, groupIds: string[]): SqlFilter => {
  const membershipFilter = groupFilters.memberOf(groupIds);
  return membershipFilter
    ? pgSql(or(audience, membershipFilter.where)!)
    : pgSql(audience);
};

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

  readableByNonLocalProfile: (groupIds: string[]): SqlFilter =>
    audienceOrMembership(groupFilters.publiclyReadable().where, groupIds),

  readableByLocalProfile: (groupIds: string[]): SqlFilter =>
    audienceOrMembership(
      or(
        groupFilters.publiclyReadable().where,
        groupFilters.locallyReadable().where,
      )!,
      groupIds,
    ),
};
