import { Endpoint } from 'sveltekit-api';
import { serverInfoSchema } from '@openpeeps/common/types';
import { serverInfo } from '@openpeeps/core/server';

export const Output = serverInfoSchema;

export default new Endpoint({ Output }).handle(() => serverInfo());
