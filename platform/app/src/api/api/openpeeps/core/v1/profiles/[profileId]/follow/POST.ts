import { Endpoint } from 'sveltekit-api';
import { followDataSchema } from '@openpeeps/common/types';
import { successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import {
  followProfileHandler,
  followParamsSchema,
} from '$lib/server/api/handlers/profile/follow';

export const Input = followDataSchema;

export const Param = followParamsSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Param, Output, Error }).handle(
  followProfileHandler,
);
