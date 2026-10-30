import { describe, expect, it } from 'vitest';
import type { SQLWrapper } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { isSqlFilter } from '../db/pg/filters';
import { canSeeGroupFilter } from './helpers';

const dialect = new PgDialect();

const flattenSql = (value: SQLWrapper): string => {
  const query = dialect.sqlToQuery(value.getSQL());
  return `${query.sql} ${JSON.stringify(query.params)}`;
};

const profile = (capabilities: string[], groupIds: string[]): ProfileWithMeta =>
  ({
    roles: [{ capabilities: { add: capabilities, remove: [] } }],
    memberships: groupIds.map((id) => ({
      group: { id },
      roles: ['admin'],
    })),
  }) as ProfileWithMeta;

const rendered = (filter: ReturnType<typeof canSeeGroupFilter>) => {
  if (!filter || !isSqlFilter(filter)) {
    throw new Error('expected sql filter');
  }
  return flattenSql(filter.where);
};

const groupId = '11111111-1111-4111-8111-111111111111';

describe('canSeeGroupFilter', () => {
  it('shows every group to community roles that can read groups', () => {
    expect(
      canSeeGroupFilter(profile(['core-groups-read'], [groupId])),
    ).toBeUndefined();
  });

  it('keeps anonymous visitors on publicly readable groups', () => {
    const sqlText = rendered(canSeeGroupFilter(undefined));
    expect(sqlText).toContain("'none'");
    expect(sqlText).not.toContain("'local'");
    expect(sqlText).not.toContain(groupId);
  });

  it('includes memberships for profiles without core-local', () => {
    const sqlText = rendered(canSeeGroupFilter(profile([], [groupId])));
    expect(sqlText).toContain("'none'");
    expect(sqlText).not.toContain("'local'");
    expect(sqlText).toContain(groupId);
  });

  it('includes local groups and memberships for local profiles', () => {
    const sqlText = rendered(
      canSeeGroupFilter(profile(['core-local'], [groupId])),
    );
    expect(sqlText).toContain("'none'");
    expect(sqlText).toContain("'local'");
    expect(sqlText).toContain(groupId);
  });
});
