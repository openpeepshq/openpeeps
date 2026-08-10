import { endpoint } from '#lib/endpoint';
import { serverCountsSchema } from '@openpeepshq/common/types';
import { serverCounts } from '@openpeepshq/core/stats';

export const Output = serverCountsSchema;

export const apiEndpoint = endpoint({ Output }).handle(() => serverCounts());
