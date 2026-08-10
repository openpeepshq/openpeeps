import { ProcessingStats, ProcessingStatsData } from '@openpeepshq/common/types';
import { map } from '../db/pg/map';

export const processingStatsMapping = map<ProcessingStatsData, ProcessingStats>(
  {
    collection: 'processingStats',
  },
);
