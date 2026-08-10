import { endpoint } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  fetchUrlReponseSchema,
  fetchUrlRequestSchema,
} from '@openpeepshq/common/types';
import { fetchUrlHandler } from '#lib/handlers';

export const Param = fetchUrlRequestSchema;

export const Output = fetchUrlReponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(fetchUrlHandler);
