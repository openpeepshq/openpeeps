import { Endpoint } from 'sveltekit-api';
import {
  successResponseSchema,
  updateAccountPasswordRequestSchema,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { updateCurrentAccountPasswordHandler } from '$lib/server/api/handlers/accounts/updateCurrent';

export const Input = updateAccountPasswordRequestSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  updateCurrentAccountPasswordHandler,
);
