import { ProcessingStats, ProcessingStatsData } from '@openpeeps/common/types';
import { map } from '../db/pg/map';

export const processingStatsMapping = map<ProcessingStatsData, ProcessingStats>(
  {
    collection: 'processingStats',
  },
);
