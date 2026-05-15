import { ProcessingStats, ProcessingStatsData } from '@openpeeps/common/types';
import { map } from '@openpeeps/arango-querybuilder';

export const processingStatsMapping = map<ProcessingStatsData, ProcessingStats>({
  collection: 'processingStats',
});
