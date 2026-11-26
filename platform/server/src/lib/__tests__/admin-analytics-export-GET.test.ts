import { describe, expect, it, vi } from 'vitest';
import type {
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
} from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import { apiEndpoint } from '../../api/openpeeps/core/v1/admin/analytics/export/GET';

// Unit-level test of the admin analytics export handler. A full Playwright
// integration run for this admin route needs a live Postgres/Redis + the built
// server image; the handler's only external dependencies are the DB-backed
// analytics (via `@openpeepshq/core/analytics`) and capability auth
// (`#lib/auth`), so those are mocked here while the handler's own branch logic
// and the real PDF rendering (via the real `buildAnalyticsPdf`) run unmocked.
vi.mock('#lib/auth', () => ({
  ensureRoleCapabilities: vi.fn(async () => undefined),
}));

vi.mock('@openpeepshq/core/analytics', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@openpeepshq/core/analytics')>();
  const range = {
    from: '2026-09-01',
    to: '2026-09-30',
    previousFrom: '2026-08-01',
    previousTo: '2026-08-31',
    preset: '30d' as const,
    compiledAt: null,
  };
  const metric = (value: number, deltaPct: number) => ({
    key: 'm',
    value,
    previousValue: Math.max(
      0,
      Math.round((value / (1 + deltaPct / 100)) * 100) / 100,
    ),
    deltaPct,
  });
  const overview: AnalyticsOverview = {
    range,
    metrics: {
      totalPosts: metric(3, 10),
      allTimePosts: metric(30, 10),
      totalMembers: metric(10, 0),
      verifiedMembers: metric(8, 0),
      unverifiedMembers: metric(2, 0),
      activeMembers: metric(4, 0),
      totalGroups: metric(2, 0),
    },
    postsOverTime: [],
    postTypes: [],
    activeUsersSeries: [],
    topMembers: [],
    topPosts: [],
    topProfiles: [],
    activitySeries: [],
    engagementRateSeries: [],
    topGroups: [],
    groupGrowthSeries: [],
    groupGrowthOverTime: [],
  };
  const growth: AnalyticsGrowth = {
    range,
    metrics: {
      newSignups: metric(2, 10),
      dau: metric(3, 10),
      mau: metric(5, 10),
      dauMau: metric(60, 10),
    },
    signupsByDay: [],
    recentSignups: [],
  };
  const engagement: AnalyticsEngagement = {
    range,
    metrics: {
      likes: metric(5, 10),
      comments: metric(2, 10),
      reposts: metric(1, 10),
      bookmarks: metric(1, 10),
      dms: metric(1, 10),
      uniqueViewers: metric(9, 10),
      impressions: metric(40, 10),
    },
    engagementOverTime: [],
    impressionsByPeriod: [],
    postsByGroup: [],
  };
  return {
    ...actual,
    buildAnalyticsBoardReport: vi.fn(async () => ({
      text: 'Executive summary\nTotal membership held steady at 10 versus the prior period.',
      // A real PDF so the base64/period assertions exercise real rendering.
      pdf: await actual.buildAnalyticsPdf({
        communityName: 'Example Community',
        overview,
        growth,
        engagement,
      }),
      overview,
      growth,
      engagement,
    })),
    exportAnalyticsCsv: vi.fn(async () => 'day,total_posts\n2026-09-01,3\n'),
  };
});

const call = (query: Record<string, unknown>, event: unknown = {}) =>
  apiEndpoint.handle({ body: {}, query, param: {}, event });

// pdfkit emits text as hex strings in `<hex> TJ` operators. This only works
// because pdfReport.ts creates the document with `compress: false` and standard
// Helvetica/WinAnsi encoding — with compression on, the text would exist only
// inside FlateDecode streams, which this helper does not inflate (it would
// silently scan binary noise instead).
const decodedPdfText = (buffer: Buffer) =>
  (buffer.toString('latin1').match(/<([0-9a-fA-F]{4,})>/g) ?? [])
    .map((h) => Buffer.from(h.slice(1, -1), 'hex').toString('latin1'))
    .join('');

describe('admin analytics export', () => {
  it('returns a PDF export that still contains the period (#1887)', async () => {
    const res = (await call({ format: 'pdf' })) as {
      filename: string;
      contentType: string;
      content: string;
      encoding: 'base64';
    };

    expect(res.contentType).toBe('application/pdf');
    expect(res.encoding).toBe('base64');
    expect(res.filename).toBe('analytics-2026-09-01-2026-09-30.pdf');
    // The visual PDF is a separate deliverable and must show the period, unlike
    // the header-free email body (#1887 review item 1).
    const pdf = Buffer.from(res.content, 'base64');
    expect(decodedPdfText(pdf)).toContain('2026-09-01 to 2026-09-30');
    expect(vi.mocked(ensureRoleCapabilities).mock.calls.at(-1)?.[1]).toEqual([
      'core-analytics-read',
    ]);
  });

  it('returns the CSV export as text by default', async () => {
    const res = (await call({})) as {
      filename: string;
      contentType: string;
      content: string;
      encoding: 'utf8';
    };

    expect(res.contentType).toBe('text/csv');
    expect(res.encoding).toBe('utf8');
    expect(res.filename).toBe('analytics-range-export.csv');
    expect(res.content).toContain('day,total_posts');
  });
});
