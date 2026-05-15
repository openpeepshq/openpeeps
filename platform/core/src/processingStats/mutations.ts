import { ProcessingStatsData } from '@openpeeps/common/types';
import { processingStatsMapping } from './mapping';
import { allpeepDb } from '../db';

export const recordProcessingStats = async (data: ProcessingStatsData) => {
  const db = await allpeepDb().then((db) => db.db);
  return processingStatsMapping.create(db, data);
};
