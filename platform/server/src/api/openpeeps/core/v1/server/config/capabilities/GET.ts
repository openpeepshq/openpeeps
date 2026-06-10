import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { capabilitiesConfigSchema } from '@openpeeps/common/types';
import { capabilitiesConfig } from '@openpeeps/core/config';

export const Output = capabilitiesConfigSchema;

export const Error = {
    403: forbidden(),
    401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(() => capabilitiesConfig());