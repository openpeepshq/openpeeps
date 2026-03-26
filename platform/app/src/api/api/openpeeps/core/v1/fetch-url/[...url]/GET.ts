import { Endpoint } from 'sveltekit-api';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  fetchUrlReponseSchema,
  fetchUrlRequestSchema,
} from '@openpeeps/common/types';
import { fetchUrlHandler } from '$lib/server/api/handlers';

export const Param = fetchUrlRequestSchema;

export const Output = fetchUrlReponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(fetchUrlHandler);
