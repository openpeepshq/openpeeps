import PDFDocument from 'pdfkit';
import type {
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
} from '@openpeepshq/common/types';

export type AnalyticsPdfData = {
  overview: AnalyticsOverview;
  growth: AnalyticsGrowth;
  engagement: AnalyticsEngagement;
};

const PAGE = { width: 612, height: 792 };
const MARGIN = 40;
const CONTENT_WIDTH = PAGE.width - MARGIN * 2;
const BOTTOM = PAGE.height - MARGIN;

const COLORS = {
  ink: '#111827',
  muted: '#6b7280',
  border: '#e5e7eb',
  soft: '#f3f4f6',
  card: '#f9fafb',
  white: '#ffffff',
  accent: '#2563eb',
  positive: '#059669',
  negative: '#dc2626',
};

const GRAY_STACK = ['#111827', '#4b5563', '#6b7280', '#9ca3af', '#d1d5db'];
const GROUP_COLORS = [
  '#2563eb',
  '#059669',
  '#d97706',
  '#dc2626',
  '#0891b2',
  '#7c3aed',
];

const POST_TYPE_META = [
  { key: 'jam' as const, label: 'Jams', color: '#111827' },
  { key: 'article' as const, label: 'Articles', color: '#4b5563' },
  { key: 'note' as const, label: 'Notes', color: '#9ca3af' },
  { key: 'poll' as const, label: 'Polls', color: '#d1d5db' },
  { key: 'event' as const, label: 'Events', color: '#6b7280' },
];

const ENGAGEMENT_SERIES = [
  { key: 'likes' as const, label: 'Likes', color: '#111827' },
  { key: 'reposts' as const, label: 'Shares', color: '#4b5563' },
  { key: 'bookmarks' as const, label: 'Bookmarks', color: '#6b7280' },
  { key: 'comments' as const, label: 'Replies', color: '#9ca3af' },
];

type Doc = PDFKit.PDFDocument;

type MetricCardInput = {
  label: string;
  value: string;
  deltaPct?: number | null;
  subtitle?: string;
};

type TableColumn = {
  key: string;
  header: string;
  width: number;
  align?: 'left' | 'right';
};

/** Single-line text that must not trigger pdfkit auto page-breaks. */
const writeText = (
  doc: Doc,
  text: string,
  x: number,
  y: number,
  options: {
    width?: number;
    align?: 'left' | 'center' | 'justify' | 'right';
    height?: number;
    ellipsis?: boolean;
  } = {},
) => {
  doc.text(text, x, y, {
    lineBreak: false,
    ...options,
    height: options.height ?? 12,
  });
};

const formatNum = (n: number) =>
  Number.isFinite(n) ? Math.round(n).toLocaleString('en-US') : '0';

const formatDelta = (deltaPct: number | null | undefined) => {
  if (deltaPct == null) return null;
  const sign = deltaPct > 0 ? '+' : '';
  return `${sign}${deltaPct}%`;
};

const averageSeries = (series: Array<{ value: number }> | undefined) => {
  if (!series?.length) return 0;
  return (
    Math.round(
      (series.reduce((acc, p) => acc + p.value, 0) / series.length) * 10,
    ) / 10
  );
};

const utcDayCount = (from: string, to: string) => {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return 1;
  return Math.round((end - start) / 86_400_000) + 1;
};

const ratePct = (numerator: number, denominator: number) =>
  denominator <= 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;

const truncate = (text: string, max: number) =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`;

const cumulativeGrowth = (
  points: AnalyticsOverview['groupGrowthOverTime'],
  series: AnalyticsOverview['groupGrowthSeries'],
) => {
  const running: Record<string, number> = Object.fromEntries(
    series.map((s) => [s.key, 0]),
  );
  return points.map((p) => {
    for (const s of series) {
      running[s.key] = (running[s.key] ?? 0) + (p.values[s.key] ?? 0);
    }
    return { label: p.label, values: { ...running } };
  });
};

const createDoc = () =>
  new PDFDocument({
    size: 'LETTER',
    margin: MARGIN,
    compress: false,
    info: {
      Title: 'Community analytics report',
      Author: 'OpenPeeps',
    },
  });

const bufferFromDoc = (doc: Doc): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

type Layout = {
  doc: Doc;
  y: number;
  pageIndex: number;
  period: string;
  sectionTitle: string;
};

const drawFooter = (layout: Layout) => {
  const { doc, pageIndex, period } = layout;
  doc.fontSize(8).fillColor(COLORS.muted);
  writeText(doc, period, MARGIN, PAGE.height - 28, {
    width: CONTENT_WIDTH / 2,
    align: 'left',
  });
  writeText(doc, `Page ${pageIndex}`, MARGIN, PAGE.height - 28, {
    width: CONTENT_WIDTH,
    align: 'right',
  });
};

const newPage = (layout: Layout, sectionTitle?: string) => {
  drawFooter(layout);
  layout.doc.addPage();
  layout.pageIndex += 1;
  layout.y = MARGIN;
  if (sectionTitle) layout.sectionTitle = sectionTitle;
  drawPageChrome(layout);
};

const ensureSpace = (layout: Layout, needed: number) => {
  if (layout.y + needed <= BOTTOM - 20) return;
  newPage(layout);
};

const drawPageChrome = (layout: Layout) => {
  const { doc, sectionTitle, period } = layout;
  doc.fontSize(18).fillColor(COLORS.ink).font('Helvetica-Bold');
  writeText(doc, sectionTitle, MARGIN, layout.y, { width: CONTENT_WIDTH });
  layout.y += 22;
  doc.fontSize(9).fillColor(COLORS.muted).font('Helvetica');
  writeText(doc, `Period ${period}`, MARGIN, layout.y, {
    width: CONTENT_WIDTH,
  });
  layout.y += 16;
  doc
    .moveTo(MARGIN, layout.y)
    .lineTo(MARGIN + CONTENT_WIDTH, layout.y)
    .strokeColor(COLORS.border)
    .lineWidth(1)
    .stroke();
  layout.y += 16;
};

const drawSectionTitle = (layout: Layout, title: string) => {
  ensureSpace(layout, 28);
  layout.doc.fontSize(11).fillColor(COLORS.ink).font('Helvetica-Bold');
  writeText(layout.doc, title, MARGIN, layout.y, { width: CONTENT_WIDTH });
  layout.y += 18;
  layout.doc.font('Helvetica');
};

const drawMetricCards = (layout: Layout, cards: MetricCardInput[]) => {
  const cols = Math.min(4, cards.length);
  const gap = 8;
  const cardW = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
  const cardH = 58;
  const rows = Math.ceil(cards.length / cols);
  ensureSpace(layout, rows * (cardH + gap));

  cards.forEach((card, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (cardW + gap);
    const y = layout.y + row * (cardH + gap);

    layout.doc
      .roundedRect(x, y, cardW, cardH, 6)
      .fillAndStroke(COLORS.card, COLORS.border);

    layout.doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica');
    writeText(layout.doc, card.label.toUpperCase(), x + 10, y + 8, {
      width: cardW - 20,
      ellipsis: true,
    });

    layout.doc.fontSize(16).fillColor(COLORS.ink).font('Helvetica-Bold');
    writeText(layout.doc, card.value, x + 10, y + 22, {
      width: cardW - 20,
      height: 18,
    });

    const delta = formatDelta(card.deltaPct);
    const sub = card.subtitle ?? '';
    const line = [delta, sub].filter(Boolean).join(' | ');
    if (line) {
      layout.doc
        .fontSize(8)
        .fillColor(
          card.deltaPct != null && card.deltaPct > 0
            ? COLORS.positive
            : card.deltaPct != null && card.deltaPct < 0
              ? COLORS.negative
              : COLORS.muted,
        )
        .font('Helvetica');
      writeText(layout.doc, line, x + 10, y + 42, {
        width: cardW - 20,
        ellipsis: true,
      });
    }
  });

  layout.y += rows * (cardH + gap) + 8;
  layout.doc.font('Helvetica').fillColor(COLORS.ink);
};

const chartFrame = (
  layout: Layout,
  height: number,
): { x: number; y: number; w: number; h: number } => {
  ensureSpace(layout, height + 8);
  const frame = { x: MARGIN, y: layout.y, w: CONTENT_WIDTH, h: height };
  layout.doc
    .roundedRect(frame.x, frame.y, frame.w, frame.h, 6)
    .fillAndStroke(COLORS.white, COLORS.border);
  layout.y += height + 12;
  return frame;
};

const drawBarChart = (
  layout: Layout,
  points: Array<{ label: string; value: number }>,
  height = 160,
) => {
  const frame = chartFrame(layout, height);
  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const plotW = frame.w - pad.l - pad.r;
  const plotH = frame.h - pad.t - pad.b;
  const max = Math.max(1, ...points.map((p) => p.value));
  const barGap = 4;
  const barW = points.length
    ? Math.max(4, (plotW - barGap * (points.length - 1)) / points.length)
    : plotW;

  layout.doc
    .moveTo(frame.x + pad.l, frame.y + pad.t)
    .lineTo(frame.x + pad.l, frame.y + pad.t + plotH)
    .lineTo(frame.x + pad.l + plotW, frame.y + pad.t + plotH)
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .stroke();

  points.forEach((p, i) => {
    const h = (p.value / max) * plotH;
    const x = frame.x + pad.l + i * (barW + barGap);
    const y = frame.y + pad.t + plotH - h;
    layout.doc.rect(x, y, barW, h).fill(COLORS.ink);
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      truncate(p.label, 8),
      x - 2,
      frame.y + pad.t + plotH + 6,
      {
        width: barW + 4,
        align: 'center',
      },
    );
  });

  layout.doc.fontSize(7).fillColor(COLORS.muted);
  writeText(layout.doc, formatNum(max), frame.x + 4, frame.y + pad.t - 2, {
    width: pad.l - 6,
    align: 'right',
  });
};

const drawStackedBarChart = (
  layout: Layout,
  points: Array<{
    label: string;
    jam: number;
    article: number;
    note: number;
    poll: number;
    event: number;
  }>,
  height = 170,
) => {
  const frame = chartFrame(layout, height);
  const pad = { t: 16, r: 12, b: 40, l: 36 };
  const plotW = frame.w - pad.l - pad.r;
  const plotH = frame.h - pad.t - pad.b;
  const totals = points.map(
    (p) => p.jam + p.article + p.note + p.poll + p.event,
  );
  const max = Math.max(1, ...totals);
  const barGap = 4;
  const barW = points.length
    ? Math.max(4, (plotW - barGap * (points.length - 1)) / points.length)
    : plotW;
  const keys = POST_TYPE_META;

  points.forEach((p, i) => {
    let stacked = 0;
    const x = frame.x + pad.l + i * (barW + barGap);
    for (const meta of keys) {
      const v = p[meta.key];
      if (v <= 0) continue;
      const h = (v / max) * plotH;
      const y = frame.y + pad.t + plotH - stacked - h;
      layout.doc.rect(x, y, barW, h).fill(meta.color);
      stacked += h;
    }
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      truncate(p.label, 8),
      x - 2,
      frame.y + pad.t + plotH + 6,
      {
        width: barW + 4,
        align: 'center',
      },
    );
  });

  let legendX = frame.x + pad.l;
  const legendY = frame.y + frame.h - 16;
  for (const meta of keys) {
    layout.doc.rect(legendX, legendY, 8, 8).fill(meta.color);
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(layout.doc, meta.label, legendX + 11, legendY - 1);
    legendX += 11 + layout.doc.widthOfString(meta.label) + 12;
  }
};

const drawLineChart = (
  layout: Layout,
  points: Array<{ label: string; value: number }>,
  height = 150,
  color = COLORS.accent,
) => {
  const frame = chartFrame(layout, height);
  const pad = { t: 16, r: 12, b: 28, l: 36 };
  const plotW = frame.w - pad.l - pad.r;
  const plotH = frame.h - pad.t - pad.b;
  const max = Math.max(1, ...points.map((p) => p.value));

  layout.doc
    .moveTo(frame.x + pad.l, frame.y + pad.t + plotH)
    .lineTo(frame.x + pad.l + plotW, frame.y + pad.t + plotH)
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .stroke();

  if (points.length === 0) return;

  const coords = points.map((p, i) => {
    const x =
      frame.x +
      pad.l +
      (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    const y = frame.y + pad.t + plotH - (p.value / max) * plotH;
    return { x, y, label: p.label };
  });

  layout.doc
    .moveTo(coords[0]!.x, coords[0]!.y)
    .strokeColor(color)
    .lineWidth(1.75);
  for (let i = 1; i < coords.length; i++) {
    layout.doc.lineTo(coords[i]!.x, coords[i]!.y);
  }
  layout.doc.stroke();

  const labelStep = Math.max(1, Math.floor(points.length / 8));
  coords.forEach((c, i) => {
    if (i % labelStep !== 0 && i !== coords.length - 1) return;
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      truncate(c.label, 8),
      c.x - 16,
      frame.y + pad.t + plotH + 6,
      {
        width: 32,
        align: 'center',
      },
    );
  });
};

const drawMultiLineChart = (
  layout: Layout,
  points: Array<{ label: string; values: Record<string, number> }>,
  series: Array<{ key: string; label: string; color: string }>,
  height = 180,
) => {
  const frame = chartFrame(layout, height);
  const pad = { t: 16, r: 12, b: 44, l: 36 };
  const plotW = frame.w - pad.l - pad.r;
  const plotH = frame.h - pad.t - pad.b;
  const max = Math.max(
    1,
    ...points.flatMap((p) => series.map((s) => p.values[s.key] ?? 0)),
  );

  layout.doc
    .moveTo(frame.x + pad.l, frame.y + pad.t + plotH)
    .lineTo(frame.x + pad.l + plotW, frame.y + pad.t + plotH)
    .strokeColor(COLORS.border)
    .lineWidth(0.75)
    .stroke();

  if (points.length === 0) return;

  for (const s of series) {
    const coords = points.map((p, i) => {
      const x =
        frame.x +
        pad.l +
        (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
      const y =
        frame.y + pad.t + plotH - ((p.values[s.key] ?? 0) / max) * plotH;
      return { x, y };
    });
    layout.doc
      .moveTo(coords[0]!.x, coords[0]!.y)
      .strokeColor(s.color)
      .lineWidth(1.75);
    for (let i = 1; i < coords.length; i++) {
      layout.doc.lineTo(coords[i]!.x, coords[i]!.y);
    }
    layout.doc.stroke();
  }

  const labelStep = Math.max(1, Math.floor(points.length / 8));
  points.forEach((p, i) => {
    if (i % labelStep !== 0 && i !== points.length - 1) return;
    const x =
      frame.x +
      pad.l +
      (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      truncate(p.label, 8),
      x - 16,
      frame.y + pad.t + plotH + 6,
      {
        width: 32,
        align: 'center',
      },
    );
  });

  let legendX = frame.x + pad.l;
  const legendY = frame.y + frame.h - 16;
  for (const s of series) {
    layout.doc.circle(legendX + 3, legendY + 3, 3).fill(s.color);
    layout.doc.fontSize(7).fillColor(COLORS.ink);
    writeText(layout.doc, truncate(s.label, 18), legendX + 10, legendY - 1);
    legendX += 10 + layout.doc.widthOfString(truncate(s.label, 18)) + 14;
    if (legendX > frame.x + frame.w - 80) break;
  }
};

const drawStackedAreaAsBars = (
  layout: Layout,
  points: Array<{
    label: string;
    likes: number;
    comments: number;
    reposts: number;
    bookmarks: number;
  }>,
  height = 170,
) => {
  const frame = chartFrame(layout, height);
  const pad = { t: 16, r: 12, b: 40, l: 36 };
  const plotW = frame.w - pad.l - pad.r;
  const plotH = frame.h - pad.t - pad.b;
  const totals = points.map(
    (p) => p.likes + p.comments + p.reposts + p.bookmarks,
  );
  const max = Math.max(1, ...totals);
  const barGap = 3;
  const barW = points.length
    ? Math.max(3, (plotW - barGap * (points.length - 1)) / points.length)
    : plotW;

  points.forEach((p, i) => {
    let stacked = 0;
    const x = frame.x + pad.l + i * (barW + barGap);
    for (const meta of ENGAGEMENT_SERIES) {
      const v = p[meta.key];
      if (v <= 0) continue;
      const h = (v / max) * plotH;
      const y = frame.y + pad.t + plotH - stacked - h;
      layout.doc.rect(x, y, barW, h).fill(meta.color);
      stacked += h;
    }
  });

  const labelStep = Math.max(1, Math.floor(points.length / 8));
  points.forEach((p, i) => {
    if (i % labelStep !== 0 && i !== points.length - 1) return;
    const x = frame.x + pad.l + i * (barW + barGap);
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      truncate(p.label, 8),
      x - 4,
      frame.y + pad.t + plotH + 6,
      {
        width: barW + 8,
        align: 'center',
      },
    );
  });

  let legendX = frame.x + pad.l;
  const legendY = frame.y + frame.h - 16;
  for (const meta of ENGAGEMENT_SERIES) {
    layout.doc.rect(legendX, legendY, 8, 8).fill(meta.color);
    layout.doc.fontSize(7).fillColor(COLORS.muted);
    writeText(layout.doc, meta.label, legendX + 11, legendY - 1);
    legendX += 11 + layout.doc.widthOfString(meta.label) + 12;
  }
};

const drawHorizontalBars = (
  layout: Layout,
  rows: Array<{ label: string; value: number; color: string; suffix?: string }>,
) => {
  const max = Math.max(1, ...rows.map((r) => r.value));
  const rowH = 22;
  ensureSpace(layout, rows.length * rowH + 20);

  for (const row of rows) {
    ensureSpace(layout, rowH);
    layout.doc.fontSize(9).fillColor(COLORS.ink);
    writeText(layout.doc, row.label, MARGIN, layout.y, { width: 100 });
    const barX = MARGIN + 110;
    const barW = CONTENT_WIDTH - 180;
    layout.doc.roundedRect(barX, layout.y + 2, barW, 10, 3).fill(COLORS.soft);
    layout.doc
      .roundedRect(barX, layout.y + 2, (row.value / max) * barW, 10, 3)
      .fill(row.color);
    layout.doc.fontSize(9).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      `${formatNum(row.value)}${row.suffix ?? ''}`,
      barX + barW + 8,
      layout.y,
      { width: 60, align: 'right' },
    );
    layout.y += rowH;
  }
  layout.y += 8;
};

const drawDayHeatmap = (
  layout: Layout,
  cells: Array<{ day: string; value: number }>,
) => {
  if (cells.length === 0) {
    layout.doc.fontSize(9).fillColor(COLORS.muted);
    writeText(layout.doc, 'No signup data in this period', MARGIN, layout.y);
    layout.y += 24;
    return;
  }

  const cellSize = 10;
  const gap = 2;
  const cols = Math.min(28, Math.ceil(Math.sqrt(cells.length * 2)));
  const rows = Math.ceil(cells.length / cols);
  const max = Math.max(1, ...cells.map((c) => c.value));
  ensureSpace(layout, rows * (cellSize + gap) + 24);

  cells.forEach((c, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * (cellSize + gap);
    const y = layout.y + row * (cellSize + gap);
    const t = c.value / max;
    const shade = Math.round(255 - t * 180);
    const fill = `#${shade.toString(16).padStart(2, '0').repeat(3)}`;
    layout.doc
      .rect(x, y, cellSize, cellSize)
      .fill(c.value === 0 ? COLORS.soft : fill);
  });

  layout.y += rows * (cellSize + gap) + 12;
  layout.doc.fontSize(8).fillColor(COLORS.muted);
  writeText(
    layout.doc,
    'Darker cells = more signups that day',
    MARGIN,
    layout.y,
  );
  layout.y += 16;
};

const drawTable = (
  layout: Layout,
  columns: TableColumn[],
  rows: Array<Record<string, string>>,
) => {
  const headerH = 18;
  const rowH = 16;
  ensureSpace(layout, headerH + rowH * Math.min(rows.length, 3) + 8);

  const drawHeader = () => {
    layout.doc.rect(MARGIN, layout.y, CONTENT_WIDTH, headerH).fill(COLORS.soft);
    let x = MARGIN + 6;
    for (const col of columns) {
      layout.doc.fontSize(8).fillColor(COLORS.muted).font('Helvetica-Bold');
      writeText(layout.doc, col.header.toUpperCase(), x, layout.y + 5, {
        width: col.width - 8,
        align: col.align ?? 'left',
      });
      x += col.width;
    }
    layout.y += headerH;
    layout.doc.font('Helvetica');
  };

  drawHeader();

  for (const row of rows) {
    if (layout.y + rowH + 2 > BOTTOM - 20) {
      newPage(layout);
      drawHeader();
    }
    let x = MARGIN + 6;
    for (const col of columns) {
      layout.doc.fontSize(8).fillColor(COLORS.ink);
      writeText(layout.doc, row[col.key] ?? '', x, layout.y + 3, {
        width: col.width - 8,
        align: col.align ?? 'left',
        ellipsis: true,
      });
      x += col.width;
    }
    layout.y += rowH;
    layout.doc
      .moveTo(MARGIN, layout.y)
      .lineTo(MARGIN + CONTENT_WIDTH, layout.y)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
  }
  layout.y += 12;
};

const startSection = (layout: Layout, title: string) => {
  newPage(layout, title);
};

const drawOverviewPage = (layout: Layout, overview: AnalyticsOverview) => {
  layout.sectionTitle = 'Overview';
  drawPageChrome(layout);
  drawMetricCards(layout, [
    {
      label: 'Total members',
      value: formatNum(overview.metrics.totalMembers.value),
      deltaPct: overview.metrics.totalMembers.deltaPct,
      subtitle: 'All-time',
    },
    {
      label: 'Active members',
      value: formatNum(overview.metrics.activeMembers.value),
      deltaPct: overview.metrics.activeMembers.deltaPct,
      subtitle: 'This period',
    },
    {
      label: 'Posts',
      value: formatNum(overview.metrics.totalPosts.value),
      deltaPct: overview.metrics.totalPosts.deltaPct,
      subtitle: 'This period',
    },
    {
      label: 'Groups',
      value: formatNum(overview.metrics.totalGroups.value),
      deltaPct: overview.metrics.totalGroups.deltaPct,
      subtitle: 'All-time',
    },
  ]);

  drawSectionTitle(layout, 'Posts over time');
  drawStackedBarChart(layout, overview.postsOverTime);

  drawSectionTitle(layout, 'Active users');
  drawLineChart(
    layout,
    overview.activeUsersSeries.map((p) => ({
      label: p.label,
      value: p.value,
    })),
  );

  drawSectionTitle(layout, 'Top members');
  drawTable(
    layout,
    [
      { key: 'member', header: 'Member', width: 180 },
      { key: 'role', header: 'Role', width: 100 },
      { key: 'joined', header: 'Joined', width: 100 },
      { key: 'contrib', header: 'Contributions', width: 152, align: 'right' },
    ],
    overview.topMembers.slice(0, 8).map((m) => ({
      member: truncate(m.displayName ?? m.handle, 28),
      role: m.role ?? 'member',
      joined: m.joinedAt.slice(0, 10),
      contrib: formatNum(m.contributions),
    })),
  );

  drawSectionTitle(layout, 'Top posts');
  drawTable(
    layout,
    [
      { key: 'post', header: 'Post', width: 260 },
      { key: 'author', header: 'Author', width: 140 },
      { key: 'views', header: 'Viewers', width: 132, align: 'right' },
    ],
    overview.topPosts.slice(0, 8).map((p) => ({
      post: truncate(p.snippet ?? p.postId, 42),
      author: truncate(p.authorDisplayName ?? p.authorHandle ?? '—', 22),
      views: formatNum(p.uniqueViewers),
    })),
  );
};

const drawMembersPage = (
  layout: Layout,
  overview: AnalyticsOverview,
  growth: AnalyticsGrowth,
) => {
  startSection(layout, 'Members');
  const engagementRate = averageSeries(overview.engagementRateSeries);
  drawMetricCards(layout, [
    {
      label: 'Total members',
      value: formatNum(overview.metrics.totalMembers.value),
      deltaPct: overview.metrics.totalMembers.deltaPct,
      subtitle: 'All-time',
    },
    {
      label: 'New members',
      value: formatNum(growth.metrics.newSignups.value),
      deltaPct: growth.metrics.newSignups.deltaPct,
      subtitle: 'This period',
    },
    {
      label: 'Active members',
      value: formatNum(overview.metrics.activeMembers.value),
      deltaPct: overview.metrics.activeMembers.deltaPct,
      subtitle: 'This period',
    },
    {
      label: 'Engagement rate',
      value: `${engagementRate}%`,
      subtitle: 'This period',
    },
  ]);

  drawSectionTitle(layout, 'Signups by day');
  const signupsByDay =
    growth.signupsByDay.length > 0
      ? growth.signupsByDay
      : (growth.metrics.newSignups.series ?? []).map((p) => ({
          day: p.day,
          value: p.value,
        }));
  drawDayHeatmap(layout, signupsByDay);

  drawSectionTitle(layout, 'Recent signups');
  drawTable(
    layout,
    [
      { key: 'member', header: 'Member', width: 180 },
      { key: 'channel', header: 'Channel', width: 140 },
      { key: 'joined', header: 'Joined', width: 212 },
    ],
    growth.recentSignups.slice(0, 12).map((s) => ({
      member: truncate(s.displayName ?? s.handle, 28),
      channel: s.channel,
      joined: s.joinedAt.slice(0, 10),
    })),
  );
};

const drawContentPage = (layout: Layout, overview: AnalyticsOverview) => {
  startSection(layout, 'Content');
  const postsThisPeriod = overview.metrics.totalPosts.value;
  const days = utcDayCount(overview.range.from, overview.range.to);
  const avgPostsPerDay = Math.round((postsThisPeriod / days) * 10) / 10;

  drawMetricCards(layout, [
    {
      label: 'Total posts',
      value: formatNum(overview.metrics.allTimePosts.value),
      deltaPct: overview.metrics.allTimePosts.deltaPct,
      subtitle: 'All-time',
    },
    {
      label: 'Posts this period',
      value: formatNum(postsThisPeriod),
      deltaPct: overview.metrics.totalPosts.deltaPct,
      subtitle: 'This period',
    },
    {
      label: 'Avg posts / day',
      value: String(avgPostsPerDay),
      subtitle: 'This period',
    },
  ]);

  drawSectionTitle(layout, 'Posts by period');
  drawBarChart(
    layout,
    overview.postsOverTime.map((p) => ({
      label: p.label,
      value: p.jam + p.article + p.note + p.poll + p.event,
    })),
  );

  drawSectionTitle(layout, 'Content distribution');
  const typeRows = POST_TYPE_META.map((meta) => {
    const found = overview.postTypes.find((p) => p.type === meta.key);
    return {
      label: meta.label,
      value: found?.count ?? 0,
      color: meta.color,
    };
  }).filter((r) => r.value > 0);
  drawHorizontalBars(layout, typeRows);
};

const drawEngagementPage = (
  layout: Layout,
  engagement: AnalyticsEngagement,
) => {
  startSection(layout, 'Engagement');
  drawMetricCards(layout, [
    {
      label: 'Likes',
      value: formatNum(engagement.metrics.likes.value),
      deltaPct: engagement.metrics.likes.deltaPct,
    },
    {
      label: 'Replies',
      value: formatNum(engagement.metrics.comments.value),
      deltaPct: engagement.metrics.comments.deltaPct,
    },
    {
      label: 'Shares',
      value: formatNum(engagement.metrics.reposts.value),
      deltaPct: engagement.metrics.reposts.deltaPct,
    },
    {
      label: 'Bookmarks',
      value: formatNum(engagement.metrics.bookmarks.value),
      deltaPct: engagement.metrics.bookmarks.deltaPct,
    },
    {
      label: 'DMs',
      value: formatNum(engagement.metrics.dms.value),
      deltaPct: engagement.metrics.dms.deltaPct,
    },
    {
      label: 'Unique viewers',
      value: formatNum(engagement.metrics.uniqueViewers.value),
      deltaPct: engagement.metrics.uniqueViewers.deltaPct,
    },
    {
      label: 'Impressions',
      value: formatNum(engagement.metrics.impressions.value),
      deltaPct: engagement.metrics.impressions.deltaPct,
    },
  ]);

  drawSectionTitle(layout, 'Engagement over time');
  drawStackedAreaAsBars(layout, engagement.engagementOverTime);

  drawSectionTitle(layout, 'Views / impressions by period');
  drawBarChart(
    layout,
    engagement.impressionsByPeriod.map((p) => ({
      label: p.label,
      value: p.value,
    })),
    150,
  );

  drawSectionTitle(layout, 'Engagement rate breakdown');
  const views = engagement.metrics.impressions.value;
  drawHorizontalBars(layout, [
    {
      label: 'Like rate',
      value: ratePct(engagement.metrics.likes.value, views),
      color: GRAY_STACK[0]!,
      suffix: '%',
    },
    {
      label: 'Share rate',
      value: ratePct(engagement.metrics.reposts.value, views),
      color: GRAY_STACK[1]!,
      suffix: '%',
    },
    {
      label: 'Bookmark rate',
      value: ratePct(engagement.metrics.bookmarks.value, views),
      color: GRAY_STACK[2]!,
      suffix: '%',
    },
    {
      label: 'Comment rate',
      value: ratePct(engagement.metrics.comments.value, views),
      color: GRAY_STACK[3]!,
      suffix: '%',
    },
    {
      label: 'Overall',
      value: ratePct(
        engagement.metrics.likes.value +
          engagement.metrics.reposts.value +
          engagement.metrics.bookmarks.value +
          engagement.metrics.comments.value,
        views,
      ),
      color: COLORS.accent,
      suffix: '%',
    },
  ]);
};

const drawGroupsPage = (layout: Layout, overview: AnalyticsOverview) => {
  startSection(layout, 'Groups');

  drawSectionTitle(layout, 'Top groups by activity');
  drawTable(
    layout,
    [
      { key: 'group', header: 'Group', width: 160 },
      { key: 'visibility', header: 'Visibility', width: 70 },
      { key: 'members', header: 'Members', width: 90, align: 'right' },
      { key: 'posts', header: 'Posts', width: 60, align: 'right' },
      { key: 'engagement', header: 'Engagement', width: 80, align: 'right' },
      { key: 'growth', header: 'Growth', width: 72, align: 'right' },
    ],
    overview.topGroups.map((g) => ({
      group: truncate(g.name ?? g.handle ?? g.groupId, 24),
      visibility: g.visibility === 'public' ? 'Public' : 'Private',
      members: `${formatNum(g.members)} / ${formatNum(g.activeMembers)}`,
      posts: formatNum(g.posts),
      engagement: `${g.engagementRate}%`,
      growth: g.growth > 0 ? `+${g.growth}` : String(g.growth),
    })),
  );

  drawSectionTitle(layout, 'Group growth (new members, cumulative)');
  const series = overview.groupGrowthSeries.map((s, i) => ({
    key: s.key,
    label: s.name,
    color: GROUP_COLORS[i % GROUP_COLORS.length]!,
  }));
  const points = cumulativeGrowth(
    overview.groupGrowthOverTime,
    overview.groupGrowthSeries,
  );
  if (series.length === 0) {
    layout.doc.fontSize(9).fillColor(COLORS.muted);
    writeText(
      layout.doc,
      'No group membership growth in this period',
      MARGIN,
      layout.y,
    );
    layout.y += 20;
  } else {
    drawMultiLineChart(layout, points, series);
  }
};

/** Multi-page visual PDF mirroring the analytics tabs. */
export const buildAnalyticsPdf = async (
  data: AnalyticsPdfData,
): Promise<Buffer> => {
  const doc = createDoc();
  const pending = bufferFromDoc(doc);
  const period = `${data.overview.range.from} to ${data.overview.range.to}`;
  const layout: Layout = {
    doc,
    y: MARGIN,
    pageIndex: 1,
    period,
    sectionTitle: 'Overview',
  };

  // Cover strip on first page before section chrome
  doc.fontSize(10).fillColor(COLORS.muted).font('Helvetica');
  writeText(doc, 'OpenPeeps - Community analytics', MARGIN, layout.y, {
    width: CONTENT_WIDTH,
  });
  layout.y += 16;
  doc.fontSize(22).fillColor(COLORS.ink).font('Helvetica-Bold');
  writeText(doc, 'Analytics report', MARGIN, layout.y, {
    width: CONTENT_WIDTH,
    height: 26,
  });
  layout.y += 28;
  doc.font('Helvetica');

  drawOverviewPage(layout, data.overview);
  drawMembersPage(layout, data.overview, data.growth);
  drawContentPage(layout, data.overview);
  drawEngagementPage(layout, data.engagement);
  drawGroupsPage(layout, data.overview);

  drawFooter(layout);
  doc.end();
  return pending;
};
