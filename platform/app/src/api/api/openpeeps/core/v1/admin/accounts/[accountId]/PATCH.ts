import { Endpoint } from 'sveltekit-api';
import {
  successResponseSchema,
  updateAccountEmailRequestSchema,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { updateAccountEmailHandler } from '$lib/server/api/handlers/accounts/updateEmail';

export const Input = updateAccountEmailRequestSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  updateAccountEmailHandler,
);
