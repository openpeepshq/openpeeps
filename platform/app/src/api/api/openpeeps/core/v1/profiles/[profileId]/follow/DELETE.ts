import { Endpoint } from 'sveltekit-api';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  unfollowProfileHandler,
  followParamsSchema,
} from '$lib/server/api/handlers/profile/follow';

export const Param = followParamsSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  unfollowProfileHandler,
);
