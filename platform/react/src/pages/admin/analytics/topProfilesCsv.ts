import type { AnalyticsProfileRow } from '@openpeepshq/common/types';

// Row shape of the "Top profiles" CSV download; the contract (4 columns,
// unique_viewers last) is pinned in topProfilesCsv.test.ts.
export const topProfilesCsvRows = (rows: AnalyticsProfileRow[]) => [
  ['profile_id', 'handle', 'display_name', 'unique_viewers'],
  ...rows.map((p) => [
    p.profileId,
    p.handle,
    p.displayName ?? '',
    p.uniqueViewers,
  ]),
];
