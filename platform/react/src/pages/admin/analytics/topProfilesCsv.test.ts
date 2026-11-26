import { describe, expect, it } from 'vitest';
import type { AnalyticsProfileRow } from '@openpeepshq/common/types';
import { topProfilesCsvRows } from './topProfilesCsv';

const rows: AnalyticsProfileRow[] = [
  { profileId: 'p1', handle: 'alice', uniqueViewers: 23 },
  {
    profileId: 'p2',
    handle: 'bob',
    displayName: 'Bob B.',
    uniqueViewers: 5,
  },
];

describe('topProfilesCsvRows (admin-UI "Top profiles" CSV contract)', () => {
  it('emits a 4-column header with unique_viewers last', () => {
    expect(topProfilesCsvRows([])).toEqual([
      ['profile_id', 'handle', 'display_name', 'unique_viewers'],
    ]);
  });

  it('maps one row per profile, blanking missing display names', () => {
    expect(topProfilesCsvRows(rows)).toEqual([
      ['profile_id', 'handle', 'display_name', 'unique_viewers'],
      ['p1', 'alice', '', 23],
      ['p2', 'bob', 'Bob B.', 5],
    ]);
  });
});
