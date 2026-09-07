import {
  type PluginSettingsEnvelope,
  type PluginSettingsPatch,
  type ProfileSettingsData,
  type ProfileSettingsUpdateData,
  type StoredProfileSettings,
  pluginSettingsContextsSchema,
  pluginSettingsEnvelopeSchema,
} from '@openpeepshq/common/types';
import { sql } from 'drizzle-orm';
import { conflict, unprocessableRequest } from '../errors';
import { allpeepDb } from '../db';
import { rowToModel } from '../db/pg/mappers';
import { hub } from '../events';
import { profileSettingsMapping, toPublicProfileSettings } from './mapping';
import { findStoredProfileSettings, profileSettingsCache } from './cache';
import { getProfileSettingsSchema } from '../plugins';
import { profileSettings } from '../db/pg/schema';
import { logger } from '../log';

const log = logger('core:profileSettings');

const notifyProfileSettingsUpdated = async (profileId: string) => {
  try {
    await profileSettingsCache.del(profileId);
  } catch (error) {
    log.error(
      { error, profileId },
      'profile settings cache invalidation failed',
    );
  }
  try {
    await hub.emit('profileSettingsUpdated', profileId);
  } catch (error) {
    log.error(
      { error, profileId },
      'profile settings event publication failed',
    );
  }
};

export const createProfileSettings = (
  profileSettingsData: ProfileSettingsData,
) =>
  allpeepDb().then(async ({ db }) => {
    const existingConfig = await findStoredProfileSettings(
      profileSettingsData.id,
    );
    if (existingConfig) {
      throw conflict({
        errorKey: 'error.configExists',
        parameters: { key: profileSettingsData.id },
      });
    }
    return profileSettingsMapping.create(db, profileSettingsData);
  });

export const updateProfileSettings = async (
  id: string,
  profileSettingsData: Partial<ProfileSettingsUpdateData>,
) => {
  const { db } = await allpeepDb();
  const ordinarySettings = { ...profileSettingsData };
  delete ordinarySettings.id;
  const body = JSON.stringify(ordinarySettings);
  const [row] = await db
    .insert(profileSettings)
    .values({
      id,
      profileId: id,
      body: ordinarySettings,
    })
    .onConflictDoUpdate({
      target: profileSettings.profileId,
      set: {
        body: sql`coalesce(${profileSettings.body}, '{}'::jsonb) || ${body}::jsonb`,
        updatedAt: sql`now()`,
      },
    })
    .returning({
      id: profileSettings.id,
      body: profileSettings.body,
      createdAt: profileSettings.createdAt,
      updatedAt: profileSettings.updatedAt,
      deletedAt: profileSettings.deletedAt,
    });
  if (!row) {
    throw new Error(`update profileSettings ${id}`);
  }
  const updatedSettings = rowToModel(
    id,
    row.body as Omit<ProfileSettingsData, 'id'>,
    row,
  ) satisfies StoredProfileSettings;
  await notifyProfileSettingsUpdated(id);
  return toPublicProfileSettings(updatedSettings);
};

const profileSettingsKey = (namespace: string, name: string) =>
  `${namespace}/${name}`;

const registeredPluginSchema = (key: string) => {
  const registered = getProfileSettingsSchema(key);
  if (!registered) {
    throw unprocessableRequest({
      errorKey: 'pluginSettingsNotFound',
      parameters: { key },
    });
  }
  return registered;
};

const validatePluginData = (key: string, data: unknown) => {
  const registered = registeredPluginSchema(key);
  try {
    return registered.schema().parse(data);
  } catch {
    throw unprocessableRequest({
      errorKey: 'invalidPluginSettings',
      parameters: { key },
    });
  }
};

const defaultPluginEnvelope = (key: string): PluginSettingsEnvelope => {
  const registered = registeredPluginSchema(key);
  return pluginSettingsEnvelopeSchema.parse({
    revision: 0,
    contexts: pluginSettingsContextsSchema.parse({}),
    data: validatePluginData(key, registered.defaults),
  });
};

export const findPluginSettings = async (
  profileId: string,
  namespace: string,
  name: string,
) => {
  const key = profileSettingsKey(namespace, name);
  const settings = await findStoredProfileSettings(profileId);
  const raw = settings?.pluginSettings?.[key];
  if (!raw) {
    return defaultPluginEnvelope(key);
  }
  try {
    const envelope = pluginSettingsEnvelopeSchema.parse(raw);
    return {
      ...envelope,
      contexts: pluginSettingsContextsSchema.parse(envelope.contexts),
      data: validatePluginData(key, envelope.data),
    };
  } catch (error) {
    if (error && typeof error === 'object' && '__allPeepError__' in error) {
      throw error;
    }
    throw unprocessableRequest({
      errorKey: 'invalidPluginSettings',
      parameters: { key },
    });
  }
};

export const updatePluginSettings = async (
  profileId: string,
  namespace: string,
  name: string,
  patch: PluginSettingsPatch,
) => {
  const key = profileSettingsKey(namespace, name);
  const data = validatePluginData(key, patch.data);
  const contexts = pluginSettingsContextsSchema.parse(patch.contexts);
  const envelope = {
    revision: patch.expectedRevision + 1,
    contexts,
    data,
  };
  const { db } = await allpeepDb();
  const existingSettings = await findStoredProfileSettings(profileId);
  if (!existingSettings && patch.expectedRevision !== 0) {
    throw conflict({
      errorKey: 'pluginSettingsRevisionConflict',
      parameters: { key },
    });
  }
  const body = JSON.stringify({ pluginSettings: { [key]: envelope } });
  const rows = await db
    .insert(profileSettings)
    .values({
      id: profileId,
      profileId,
      body: { pluginSettings: { [key]: envelope } },
    })
    .onConflictDoUpdate({
      target: profileSettings.profileId,
      set: {
        body: sql`jsonb_set(
          coalesce(${profileSettings.body}, '{}'::jsonb),
          '{pluginSettings}',
          jsonb_set(
            coalesce(${profileSettings.body}->'pluginSettings', '{}'::jsonb),
            array[${key}],
            ${body}::jsonb->'pluginSettings'->${key},
            true
          ),
          true
        )`,
        updatedAt: sql`now()`,
      },
      where: sql`coalesce(
        jsonb_extract_path_text(
          ${profileSettings.body},
          'pluginSettings',
          ${key}::text,
          'revision'
        )::int,
        0
      ) = ${patch.expectedRevision}::int`,
    })
    .returning({ body: profileSettings.body });
  if (rows.length === 0) {
    throw conflict({
      errorKey: 'pluginSettingsRevisionConflict',
      parameters: { key },
    });
  }

  await notifyProfileSettingsUpdated(profileId);
  return pluginSettingsEnvelopeSchema.parse(envelope);
};
