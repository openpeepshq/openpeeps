import { eq } from 'drizzle-orm';
import { allpeepDb } from '../db';
import { configs } from '../db/pg/schema/documents';
import { nowIso } from '../db/pg/mappers';

// Single JSONB row keyed by plugin key -> desired enabled state. A missing
// entry means "no override"; the static `openpeeps.enabled` package.json
// gate decides. Reuses the generic `configs` table rather than a dedicated
// one — this is a small, boot-time-read key/value document, not a relation.
const PLUGIN_STATE_KEY = 'openpeeps-plugin-state';

type PluginStateBody = Record<string, boolean>;

export const getPluginStateOverrides = (): Promise<PluginStateBody> =>
  allpeepDb().then(async ({ db }) => {
    const rows = await db
      .select()
      .from(configs)
      .where(eq(configs.key, PLUGIN_STATE_KEY))
      .limit(1);
    return (rows[0]?.body as PluginStateBody | undefined) ?? {};
  });

export const setPluginEnabledOverride = (pluginKey: string, enabled: boolean) =>
  getPluginStateOverrides().then((overrides) => {
    const body: PluginStateBody = { ...overrides, [pluginKey]: enabled };
    const ts = nowIso();
    return allpeepDb().then(({ db }) =>
      db
        .insert(configs)
        .values({ key: PLUGIN_STATE_KEY, body, createdAt: ts, updatedAt: ts })
        .onConflictDoUpdate({
          target: configs.key,
          set: { body, updatedAt: ts },
        }),
    );
  });
