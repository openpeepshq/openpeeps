import { config } from '../config';
import { allpeepDb } from '../db';
import { conflict } from '../errors';
import { baseProfilesMapping } from './mapping';

/** Throws when non-deleted profile count is at or above server.maxProfiles. */
export const assertProfileCapacity = async () => {
  const coreConfig = await config();
  const maxProfiles = coreConfig.server.maxProfiles;
  if (!maxProfiles || maxProfiles <= 0) {
    return;
  }

  const { db } = await allpeepDb();
  const count = await baseProfilesMapping.count(db);
  if (count >= maxProfiles) {
    throw conflict({
      errorKey: 'maxProfilesReached',
      parameters: { maxProfiles, count },
    });
  }
};
