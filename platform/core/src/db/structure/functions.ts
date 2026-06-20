import { checkCapabilities, mergeCapabilities } from '@openpeeps/common/lib';
import { UserFunctionDefinition } from '../types';

export const userFunctionDefinitions: UserFunctionDefinition[] = [
  {
    name: 'CHECK_CAPABILITIES',
    dbFunction: checkCapabilities,
  },
  {
    name: 'MERGE_CAPABILITIES',
    dbFunction: mergeCapabilities,
  },
];
