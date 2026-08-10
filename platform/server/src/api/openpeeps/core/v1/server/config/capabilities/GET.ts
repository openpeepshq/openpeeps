import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { capabilitiesConfigSchema } from '@openpeepshq/common/types';
import { capabilitiesConfig } from '@openpeepshq/core/config';

export const Output = capabilitiesConfigSchema;

export const Error = {
    403: forbidden(),
    401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(() => capabilitiesConfig());