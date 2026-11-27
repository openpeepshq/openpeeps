import { describe, expect, it, vi } from 'vitest';
import type {
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
} from '@openpeepshq/common/types';
import { getTableColumns } from 'drizzle-orm';
import { communityConfig } from '../config';
import { defaultCommunityConfig } from '../config/defaults/community';
import { buildAnalyticsPdf } from './pdfReport';
import {
  buildAnalyticsBoardReport,
  buildSimplePdf,
  sendMonthlyAnalyticsReport,
} from './report';
import {
  getAnalyticsEngagement,
  getAnalyticsGrowth,
  getAnalyticsOverview,
} from './read';
import { analyticsReportDeliveries } from '../db/pg/schema/analytics';
import { getAnalyticsReportSettings } from './settings';

vi.mock('../config', () => ({
  communityConfig: vi.fn(),
}));

vi.mock('./read', () => ({
  getAnalyticsOverview: vi.fn(),
  getAnalyticsGrowth: vi.fn(),
  getAnalyticsEngagement: vi.fn(),
}));

vi.mock('./settings', () => ({
  getAnalyticsReportSettings: vi.fn(),
}));

const { insertValues, dbMock } = vi.hoisted(() => {
  const insertValues = vi.fn();
  const dbMock = {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve([])) })),
    })),
  };
  return { insertValues, dbMock };
});
vi.mock('../db', () => ({
  database: vi.fn(async () => dbMock),
}));

vi.mock('../email', () => ({
  sendEmailQueue: vi.fn(() => ({ add: vi.fn(async () => undefined) })),
}));

const metric = (value: number, previousValue = value) => ({
  key: 'm',
  value,
  previousValue,
  deltaPct:
    previousValue === 0
      ? null
      : Math.round(((value - previousValue) / previousValue) * 1000) / 10,
  series: [
    { day: '2026-07-01', value: Math.max(0, value - 1) },
    { day: '2026-07-02', value },
  ],
});

const range = {
  from: '2026-07-01',
  to: '2026-07-31',
  previousFrom: '2026-06-01',
  previousTo: '2026-06-30',
  preset: '30d' as const,
  compiledAt: null,
};

const overviewFixture: AnalyticsOverview = {
  range,
  metrics: {
    totalPosts: metric(40, 30),
    allTimePosts: metric(400, 360),
    totalMembers: metric(120, 100),
    activeMembers: metric(45, 40),
    totalGroups: metric(8, 7),
    jamSessions: metric(6, 5),
    jamParticipants: metric(12, 10),
    jamMinutes: metric(180, 150),
    jamUniqueAttendees: metric(9, 8),
    jamPeakConcurrent: metric(3, 2),
    jamRecordings: metric(2, 1),
  },
  postsOverTime: [
    {
      day: '2026-07-01',
      label: 'W27',
      jam: 1,
      article: 2,
      note: 5,
      poll: 0,
      event: 1,
      resource: 0,
    },
    {
      day: '2026-07-08',
      label: 'W28',
      jam: 0,
      article: 1,
      note: 8,
      poll: 1,
      event: 0,
      resource: 0,
    },
  ],
  postTypes: [
    { type: 'note', count: 20 },
    { type: 'article', count: 10 },
    { type: 'jam', count: 5 },
    { type: 'poll', count: 3 },
    { type: 'event', count: 2 },
    { type: 'resource', count: 0 },
  ],
  activeUsersSeries: [
    { day: '2026-07-01', label: 'W27', value: 20 },
    { day: '2026-07-08', label: 'W28', value: 25 },
  ],
  jamsOverTime: [
    { day: '2026-07-01', label: 'W27', value: 3 },
    { day: '2026-07-08', label: 'W28', value: 4 },
  ],
  topMembers: [
    {
      profileId: 'p1',
      handle: 'alice',
      displayName: 'Alice',
      role: 'member',
      joinedAt: '2026-01-01T00:00:00.000Z',
      contributions: 12,
    },
  ],
  topPosts: [
    {
      postId: 'post1',
      snippet: 'Hello world',
      authorHandle: 'alice',
      authorDisplayName: 'Alice',
      postType: 'note',
      uniqueViewers: 15,
      viewEvents: 40,
    },
  ],
  activitySeries: [],
  engagementRateSeries: [
    { day: '2026-07-01', value: 12 },
    { day: '2026-07-08', value: 14 },
  ],
  topGroups: [
    {
      groupId: 'g1',
      handle: 'zing',
      name: 'Zing!',
      posts: 4,
      likes: 2,
      comments: 1,
      uniqueViewers: 3,
      activity: 7,
      visibility: 'public',
      members: 10,
      activeMembers: 4,
      engagementRate: 100,
      growth: 2,
      dailyVisits: 1,
    },
  ],
  groupGrowthSeries: [
    { key: 'g0', groupId: 'g1', name: 'Zing!' },
    { key: 'g1', groupId: 'g2', name: 'Builders' },
  ],
  groupGrowthOverTime: [
    { day: '2026-07-01', label: 'W27', values: { g0: 1, g1: 0 } },
    { day: '2026-07-08', label: 'W28', values: { g0: 1, g1: 2 } },
  ],
};

const growthFixture: AnalyticsGrowth = {
  range,
  metrics: {
    newSignups: metric(18, 12),
    dau: metric(22, 18),
    mau: metric(80, 70),
    dauMau: metric(27.5, 25.7),
  },
  signupsByDay: [
    { day: '2026-07-01', value: 2 },
    { day: '2026-07-02', value: 0 },
    { day: '2026-07-03', value: 4 },
  ],
  recentSignups: [
    {
      profileId: 'p2',
      handle: 'bob',
      displayName: 'Bob',
      joinedAt: '2026-07-03T12:00:00.000Z',
      channel: 'invite',
    },
  ],
};

const engagementFixture: AnalyticsEngagement = {
  range,
  metrics: {
    likes: metric(50, 40),
    comments: metric(20, 15),
    reposts: metric(8, 6),
    bookmarks: metric(12, 10),
    dms: metric(5, 4),
    uniqueViewers: metric(80, 70),
    impressions: metric(200, 160),
  },
  engagementOverTime: [
    {
      day: '2026-07-01',
      label: 'W27',
      likes: 10,
      comments: 4,
      reposts: 2,
      bookmarks: 3,
      dms: 1,
    },
    {
      day: '2026-07-08',
      label: 'W28',
      likes: 14,
      comments: 6,
      reposts: 1,
      bookmarks: 4,
      dms: 2,
    },
  ],
  impressionsByPeriod: [
    { day: '2026-07-01', label: 'W27', value: 80 },
    { day: '2026-07-08', label: 'W28', value: 120 },
  ],
  postsByGroup: overviewFixture.topGroups,
};

describe('buildAnalyticsPdf', () => {
  it('builds a multi-page visual PDF for the analytics tabs', async () => {
    const pdf = await buildAnalyticsPdf({
      communityName: 'Example Community',
      overview: overviewFixture,
      growth: growthFixture,
      engagement: engagementFixture,
    });
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF')).toBe(true);
    expect(text).toContain('%%EOF');
    expect(text).toContain('Example Community analytics report');
    const pageCount = Number(text.match(/\/Count\s+(\d+)/)?.[1] ?? 0);
    expect(pageCount).toBeGreaterThanOrEqual(5);
    expect(pdf.byteLength).toBeGreaterThan(5_000);
  });
});

describe('buildAnalyticsBoardReport', () => {
  it('omits the title and period from the email body', async () => {
    vi.mocked(getAnalyticsOverview).mockResolvedValue(overviewFixture);
    vi.mocked(getAnalyticsGrowth).mockResolvedValue(growthFixture);
    vi.mocked(getAnalyticsEngagement).mockResolvedValue(engagementFixture);
    vi.mocked(communityConfig).mockResolvedValue(defaultCommunityConfig);

    const { text } = await buildAnalyticsBoardReport();

    // The email template renders the title and `Period:` line itself, so the
    // body must not repeat them (#1887).
    expect(text.startsWith('Executive summary')).toBe(true);
    expect(text).not.toContain('Community analytics report');
    expect(text).not.toContain('Period:');
  });

  it('keeps the period in the PDF export while omitting it from the email body', async () => {
    vi.mocked(getAnalyticsOverview).mockResolvedValue(overviewFixture);
    vi.mocked(getAnalyticsGrowth).mockResolvedValue(growthFixture);
    vi.mocked(getAnalyticsEngagement).mockResolvedValue(engagementFixture);
    vi.mocked(communityConfig).mockResolvedValue(defaultCommunityConfig);

    const { text, pdf } = await buildAnalyticsBoardReport();
    // pdfkit emits text as hex strings in `<hex> TJ` operators, so decode
    // them before searching for the period in the rendered content. This only
    // works because pdfReport.ts creates the document with `compress: false`
    // and standard Helvetica/WinAnsi encoding — with compression on, the text
    // would exist only inside FlateDecode streams, which this helper does not
    // inflate (it would silently scan binary noise instead).
    const pdfText = (pdf.toString('latin1').match(/<([0-9a-fA-F]{4,})>/g) ?? [])
      .map((h) => Buffer.from(h.slice(1, -1), 'hex').toString('latin1'))
      .join('');

    // The visual PDF is a separate deliverable and must still show the period,
    // rendered as `${range.from} to ${range.to}` in the page chrome/footer
    // (#1887 review item 1: verify the PDF export keeps the period).
    expect(pdfText).toContain(`${range.from} to ${range.to}`);
    // …while the plain-text email body stays header-free.
    expect(text).not.toContain(range.from);
    expect(text).not.toContain('Period:');
  });
});

describe('sendMonthlyAnalyticsReport', () => {
  it('stores periodStart/periodEnd on the delivery record without repeating them in body.text', async () => {
    vi.mocked(getAnalyticsReportSettings).mockResolvedValue({
      enabled: true,
      recipients: ['admin@example.com'],
    });
    vi.mocked(getAnalyticsOverview).mockResolvedValue(overviewFixture);
    vi.mocked(getAnalyticsGrowth).mockResolvedValue(growthFixture);
    vi.mocked(getAnalyticsEngagement).mockResolvedValue(engagementFixture);
    vi.mocked(communityConfig).mockResolvedValue(defaultCommunityConfig);
    insertValues.mockClear();

    const result = await sendMonthlyAnalyticsReport({
      from: '2026-10-01',
      to: '2026-10-31',
    });

    expect(result.sent).toBe(true);
    const record = (insertValues.mock.calls[0] as [Record<string, unknown>])[0];
    expect(record).toMatchObject({
      periodStart: '2026-10-01',
      periodEnd: '2026-10-31',
      recipients: ['admin@example.com'],
      status: 'sending',
    });
    const body = record.body as {
      text: string;
      pdfAttached: boolean;
      filename: string;
    };
    expect(body.pdfAttached).toBe(true);
    // The period lives only in the dedicated periodStart/periodEnd columns; the
    // stored body must not repeat it or #1887 regresses (#1887 review item 2).
    expect(body.text).not.toContain('2026-10-01');
    expect(body.text).not.toContain('2026-10-31');
    expect(body.text).not.toContain('Period:');
    expect(body.text.startsWith('Executive summary')).toBe(true);
  });
});

describe('analyticsReportDeliveries schema', () => {
  it('keeps the body JSONB separate from the dedicated period columns', () => {
    // The period lives in dedicated periodStart/periodEnd columns and the
    // stored body is header-free (#1887); this pins the split at the schema
    // level so a reshape can't silently re-merge the period into `body`.
    const columns = getTableColumns(analyticsReportDeliveries);
    expect(Object.keys(columns).sort()).toEqual(
      [
        'body',
        'createdAt',
        'id',
        'periodEnd',
        'periodStart',
        'recipients',
        'status',
      ].sort(),
    );
    expect(columns.periodStart.columnType).toBe('PgDateString');
    expect(columns.periodEnd.columnType).toBe('PgDateString');
    expect(columns.body.columnType).toBe('PgJsonb');
  });
});

describe('buildSimplePdf', () => {
  it('still builds a single-page text PDF', () => {
    const pdf = buildSimplePdf('Executive summary\nTotal membership: 120');
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 1');
  });
});
