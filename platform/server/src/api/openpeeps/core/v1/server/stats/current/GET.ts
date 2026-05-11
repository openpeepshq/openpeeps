import { endpoint } from '#lib/endpoint';
import { serverCountsSchema } from '@openpeeps/common/types';
import { serverCounts } from '@openpeeps/core/stats';

export const Output = serverCountsSchema;

export const apiEndpoint = endpoint({ Output }).handle(() => serverCounts());
