import { Endpoint } from 'sveltekit-api';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import { capabilitiesConfigSchema } from '@openpeeps/common/types';
import { capabilitiesConfig } from '@openpeeps/core/config';

export const Output = capabilitiesConfigSchema;

export const Error = {
    403: forbidden(),
    401: authNeeded(),
};

export default new Endpoint({ Output, Error }).handle(() => capabilitiesConfig());