import { endOfMonth, formatISO, startOfMonth, subMonths } from 'date-fns';
import { eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { AnalyticsDateQuery } from '@openpeepshq/common/types';
import { sendEmailQueue } from '../email';
import { database } from '../db';
import { analyticsReportDeliveries } from '../db/pg/schema/analytics';
import { logger } from '../log';
import { buildAnalyticsPdf } from './pdfReport';
import {
  getAnalyticsEngagement,
  getAnalyticsGrowth,
  getAnalyticsOverview,
} from './read';
import { getAnalyticsReportSettings } from './settings';

const log = logger('app:analytics:report');

const dayString = (d: Date) => formatISO(d, { representation: 'date' });

const formatDelta = (deltaPct: number | null | undefined) =>
  deltaPct == null ? 'n/a' : `${deltaPct > 0 ? '+' : ''}${deltaPct}%`;

const narrativeSentence = (
  label: string,
  value: number,
  deltaPct: number | null | undefined,
) => {
  if (deltaPct == null) {
    return `${label} stood at ${value} for the period.`;
  }
  if (deltaPct > 0) {
    return `${label} rose to ${value} (${formatDelta(deltaPct)} vs the prior period).`;
  }
  if (deltaPct < 0) {
    return `${label} was ${value} (${formatDelta(deltaPct)} vs the prior period).`;
  }
  return `${label} held steady at ${value} versus the prior period.`;
};

/** Board-ready report: plain-text email body + visual multi-page PDF. */
export const buildAnalyticsBoardReport = async (
  query: AnalyticsDateQuery = {},
) => {
  const [overview, growth, engagement] = await Promise.all([
    getAnalyticsOverview(query),
    getAnalyticsGrowth(query),
    getAnalyticsEngagement(query),
  ]);
  const from = overview.range.from;
  const to = overview.range.to;

  const total = overview.metrics.totalMembers.value;
  const active = overview.metrics.activeMembers.value;
  const activeShare = total > 0 ? Math.round((active / total) * 1000) / 10 : 0;

  const summary = [
    `Executive summary (${from} → ${to})`,
    '',
    narrativeSentence(
      'Total membership',
      overview.metrics.totalMembers.value,
      overview.metrics.totalMembers.deltaPct,
    ),
    narrativeSentence(
      'Active members',
      overview.metrics.activeMembers.value,
      overview.metrics.activeMembers.deltaPct,
    ),
    `${activeShare}% of members were active in this period.`,
    narrativeSentence(
      'Posts published',
      overview.metrics.totalPosts.value,
      overview.metrics.totalPosts.deltaPct,
    ),
    narrativeSentence(
      'Groups',
      overview.metrics.totalGroups.value,
      overview.metrics.totalGroups.deltaPct,
    ),
    narrativeSentence(
      'Content impressions',
      engagement.metrics.impressions.value,
      engagement.metrics.impressions.deltaPct,
    ),
  ];

  const text = [
    `Community analytics report`,
    `Period: ${from} → ${to}`,
    '',
    ...summary,
  ].join('\n');

  const pdf = await buildAnalyticsPdf({ overview, growth, engagement });

  return { text, pdf, overview, growth, engagement };
};

/** @deprecated Prefer buildAnalyticsBoardReport().pdf — kept for tests. */
export const buildSimplePdf = (text: string): Buffer => {
  const escapedLines = text
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .split('\n');

  const linesPerPage = 48;
  const pages: string[][] = [];
  for (let i = 0; i < escapedLines.length; i += linesPerPage) {
    pages.push(escapedLines.slice(i, i + linesPerPage));
  }
  if (pages.length === 0) {
    pages.push(['']);
  }

  const pageContentStreams = pages.map((pageLines) =>
    pageLines
      .map((line, i) => `BT /F1 10 Tf 50 ${750 - i * 14} Td (${line}) Tj ET`)
      .join('\n'),
  );

  const pageCount = pages.length;
  const pageDictStart = 3;
  const contentStart = pageDictStart + pageCount;
  const fontObjNum = contentStart + pageCount;
  const kids = pages.map((_, i) => `${pageDictStart + i} 0 R`).join(' ');
  const objects: string[] = [
    '1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n',
    `2 0 obj<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>endobj\n`,
  ];

  for (let i = 0; i < pageCount; i++) {
    objects.push(
      `${pageDictStart + i} 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents ${contentStart + i} 0 R /Resources << /Font << /F1 ${fontObjNum} 0 R >> >> >>endobj\n`,
    );
  }

  for (let i = 0; i < pageCount; i++) {
    const stream = pageContentStreams[i];
    objects.push(
      `${contentStart + i} 0 obj<< /Length ${Buffer.byteLength(stream)} >>stream\n${stream}\nendstream\nendobj\n`,
    );
  }

  objects.push(
    `${fontObjNum} 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\n`,
  );

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(pdf));
    pdf += obj;
  }
  const xrefStart = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i < offsets.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf);
};

export const sendMonthlyAnalyticsReport = async (overridePeriod?: {
  from: string;
  to: string;
}): Promise<{ sent: boolean; recipients: string[] }> => {
  const settings = await getAnalyticsReportSettings();
  if (!settings.enabled || settings.recipients.length === 0) {
    log.info('Monthly analytics report skipped (disabled or no recipients)');
    return { sent: false, recipients: [] };
  }

  const previousMonth = subMonths(new Date(), 1);
  const from = overridePeriod?.from ?? dayString(startOfMonth(previousMonth));
  const to = overridePeriod?.to ?? dayString(endOfMonth(previousMonth));

  const { text, pdf } = await buildAnalyticsBoardReport({ from, to });
  const filename = `analytics-${from}-${to}.pdf`;
  const db = await database();
  const deliveryId = uuidv7();

  await db.insert(analyticsReportDeliveries).values({
    id: deliveryId,
    periodStart: from,
    periodEnd: to,
    recipients: settings.recipients,
    status: 'sending',
    body: { text, pdfAttached: true, filename },
  });

  const queue = sendEmailQueue();
  await Promise.all(
    settings.recipients.map((toAddr) =>
      queue.add('analytics-monthly-report', {
        to: toAddr,
        template: 'analyticsMonthlyReport',
        locals: {
          periodFrom: from,
          periodTo: to,
          reportText: text,
        },
        attachments: [
          {
            filename,
            content: pdf.toString('base64'),
            contentType: 'application/pdf',
            encoding: 'base64',
          },
        ],
      }),
    ),
  );

  await db
    .update(analyticsReportDeliveries)
    .set({ status: 'sent' })
    .where(eq(analyticsReportDeliveries.id, deliveryId));

  log.info(
    `Monthly analytics report sent to ${settings.recipients.length} recipients`,
  );
  return { sent: true, recipients: settings.recipients };
};
