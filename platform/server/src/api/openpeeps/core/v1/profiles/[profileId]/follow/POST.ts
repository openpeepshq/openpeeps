import { endpoint } from '#lib/endpoint';
import { followDataSchema } from '@openpeepshq/common/types';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import {
  followProfileHandler,
  followParamsSchema,
} from '#lib/handlers/profile/follow';

export const Input = followDataSchema;

export const Param = followParamsSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
  followProfileHandler,
);
