import { Database } from "arangojs";
import { baseProfilesMapping } from "../../../profiles/mapping";
import { logger } from "../../../log";
import { profileSettingsMapping } from "../../../profileSettings";
import { ensureIndexedCollection } from "../../helpers";
import { collectionInfos } from "../../structure";

const log = logger('db:dataMigrations');


export default {
  key: 'b1f4c3d2-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  info: 'Create default profile configs for existing profiles',
  migration: async (db: Database) => {

    if (!(await db.collection('profiles').exists())) {
      log.info('Profiles collection does not exist, skipping migration');
      return;
    }

    if (!(await db.collection('profileSettings').exists())) {
      log.info('Creating profileSettings collection');
      await ensureIndexedCollection(db, collectionInfos.profileSettingsCollection);
    }

    const allProfiles = (await baseProfilesMapping.all(db));
    for (const profile of allProfiles) {
      const existingConfig = await profileSettingsMapping.find(db, profile.id);

      if (!existingConfig) {
        log.info(`Creating default profile config for profile ${profile.id}`);
        await profileSettingsMapping.create(db, { id: profile.id, theme: 'community' });
      } else {
        continue
      }
    }

  },
};