import { sql, type SQL } from 'drizzle-orm';

/**
 * The member population the active-member metrics are measured against:
 * local, non-deleted profiles (the same predicate as totalMembersAt and the
 * newMembers rollup). The activeMembers card/MAU (via countDistinctActives)
 * and the daily active_members rollup compose from this fragment so the
 * active <= total invariant cannot regress through divergent copies of the
 * scope. Retention cohorts and topMembers intentionally do NOT compose from
 * it — they measure raw actor activity (whether the same profile acted, who
 * contributed most), not member-population actives.
 */
export const localMemberScope = (actorIdColumn: SQL): SQL =>
  sql`join profiles p on p.id::text = ${actorIdColumn}
      where p.type = 'local' and p.deleted_at is null`;
