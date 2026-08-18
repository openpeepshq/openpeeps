import { describe, expect, it } from 'vitest';
import type {
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
} from '@openpeepshq/common/types';
import { buildAnalyticsPdf } from './pdfReport';
import { buildSimplePdf } from './report';

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
    },
    {
      day: '2026-07-08',
      label: 'W28',
      jam: 0,
      article: 1,
      note: 8,
      poll: 1,
      event: 0,
    },
  ],
  postTypes: [
    { type: 'note', count: 20 },
    { type: 'article', count: 10 },
    { type: 'jam', count: 5 },
    { type: 'poll', count: 3 },
    { type: 'event', count: 2 },
  ],
  activeUsersSeries: [
    { day: '2026-07-01', label: 'W27', value: 20 },
    { day: '2026-07-08', label: 'W28', value: 25 },
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

describe('buildSimplePdf', () => {
  it('still builds a single-page text PDF', () => {
    const pdf = buildSimplePdf('Community analytics report\nPeriod: 2026-07');
    const text = pdf.toString('latin1');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Count 1');
  });
});
