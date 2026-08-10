import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { serverInfoSchema } from '@openpeepshq/common/types';
import { serverInfo } from '@openpeepshq/core/server';

export const Output = serverInfoSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(() => serverInfo());
