import { expect, test } from '@playwright/test';
import { sql } from 'drizzle-orm';
import { allpeepDb } from '@openpeepshq/core/db';
import { assignRole } from '@openpeepshq/core/profiles';
import { findRoleByKey } from '@openpeepshq/core/roles';
import {
  currentProfile,
  registerUser,
  uniqueHandle,
} from '../../../helpers/api';

const countRoleEdges = async (profileId: string, roleId: string) => {
  const { db } = await allpeepDb();
  const result = (await db.execute(sql`
    SELECT count(*)::int AS count
    FROM has_role
    WHERE from_id = ${profileId}
      AND to_id = ${roleId}
  `)) as unknown as { rows: { count: number }[] };
  return result.rows[0]?.count ?? -1;
};

const registerFreshProfile = async (
  request: Parameters<typeof registerUser>[0],
  prefix: string,
) => {
  const handle = uniqueHandle(prefix);
  const { token } = await registerUser(request, {
    handle,
    email: `${handle}@openpeeps.test`,
    password: 'testtest12',
  });
  return currentProfile(request, token);
};

test.describe('role assignment (has_role)', () => {
  test('assigning the same role twice keeps a single edge', async ({
    request,
  }) => {
    const profile = await registerFreshProfile(request, 'roledup');
    const member = await findRoleByKey('member');
    if (!member) throw new Error('member role missing');

    await assignRole(profile as never, member);
    await assignRole(profile as never, member);

    expect(await countRoleEdges(profile.id, member.id)).toBe(1);
  });

  test('concurrent assigns of the same role keep a single edge', async ({
    request,
  }) => {
    const profile = await registerFreshProfile(request, 'roleconcur');
    const member = await findRoleByKey('member');
    if (!member) throw new Error('member role missing');

    // Both assigns start before either completes; a check-then-insert
    // implementation throws a unique violation for the loser of the race.
    await Promise.all([
      assignRole(profile as never, member),
      assignRole(profile as never, member),
    ]);

    expect(await countRoleEdges(profile.id, member.id)).toBe(1);
  });
});
