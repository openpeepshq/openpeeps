import { endpoint } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import {
  unfollowProfileHandler,
  followParamsSchema,
} from '#lib/handlers/profile/follow';

export const Param = followParamsSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  unfollowProfileHandler,
);
