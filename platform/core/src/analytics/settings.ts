import type { AnalyticsReportSettings } from '@openpeepshq/common/types';
import { eq } from 'drizzle-orm';
import { database } from '../db';
import { analyticsSettings } from '../db/pg/schema/analytics';

const DEFAULT_SETTINGS: AnalyticsReportSettings = {
  enabled: false,
  recipients: [],
};

export const getAnalyticsReportSettings =
  async (): Promise<AnalyticsReportSettings> => {
    const db = await database();
    const rows = await db
      .select()
      .from(analyticsSettings)
      .where(eq(analyticsSettings.id, 'default'))
      .limit(1);
    const body = (rows[0]?.body ?? {}) as Partial<AnalyticsReportSettings>;
    return {
      enabled: body.enabled ?? DEFAULT_SETTINGS.enabled,
      recipients: body.recipients ?? DEFAULT_SETTINGS.recipients,
    };
  };

export const setAnalyticsReportSettings = async (
  settings: AnalyticsReportSettings,
): Promise<AnalyticsReportSettings> => {
  const db = await database();
  const now = new Date().toISOString();
  await db
    .insert(analyticsSettings)
    .values({
      id: 'default',
      body: settings,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: analyticsSettings.id,
      set: { body: settings, updatedAt: now },
    });
  return settings;
};
