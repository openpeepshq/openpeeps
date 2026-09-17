import { endpoint } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import {
  blockParamsSchema,
  blockProfileHandler,
} from '#lib/handlers/profile/block';

export const Param = blockParamsSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  blockProfileHandler,
);
