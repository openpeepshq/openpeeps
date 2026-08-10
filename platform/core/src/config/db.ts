import { eq } from 'drizzle-orm';
import { ConfigData } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { configs } from '../db/pg/schema/documents';
import { nowIso } from '../db/pg/mappers';

export const storeConfig = (key: string, config: ConfigData) =>
  allpeepDb().then(async ({ db }) => {
    const ts = nowIso();
    const rows = await db
      .insert(configs)
      .values({ key, body: config, createdAt: ts, updatedAt: ts })
      .onConflictDoUpdate({
        target: configs.key,
        set: { body: config, updatedAt: ts },
      })
      .returning();
    return rows[0]?.body as ConfigData;
  });

export const loadConfig = (key: string) =>
  allpeepDb().then(async ({ db }) => {
    const rows = await db
      .select()
      .from(configs)
      .where(eq(configs.key, key))
      .limit(1);
    return rows[0]?.body as ConfigData | undefined;
  });
