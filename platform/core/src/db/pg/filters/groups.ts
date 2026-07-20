import { inArray, or, sql } from 'drizzle-orm';
import { groups } from '../schema/documents';
import { pgSql, type SqlFilter } from './types';

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

  readableByLocalProfile: (groupIds: string[]): SqlFilter => {
    const membershipFilter = groupFilters.memberOf(groupIds);
    const readable = or(
      groupFilters.publiclyReadable().where,
      groupFilters.locallyReadable().where,
    )!;
    return membershipFilter
      ? pgSql(or(readable, membershipFilter.where)!)
      : pgSql(readable);
  },
};
