import { Endpoint } from 'sveltekit-api';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { serverInfoSchema } from '@openpeeps/common/types';
import { serverInfo } from '@openpeeps/core/server';

export const Output = serverInfoSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export default new Endpoint({ Output, Error }).handle(() => serverInfo());
