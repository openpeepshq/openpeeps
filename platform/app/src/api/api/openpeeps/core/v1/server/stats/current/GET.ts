import { Endpoint } from 'sveltekit-api';
import { serverCountsSchema } from '@openpeeps/common/types';
import { serverCounts } from '@openpeeps/core/stats';

export const Output = serverCountsSchema;

export default new Endpoint({ Output }).handle(() => serverCounts());
