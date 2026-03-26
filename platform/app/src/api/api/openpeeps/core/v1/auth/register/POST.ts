import { Endpoint } from 'sveltekit-api';
import {
  registerRequestSchema,
  tokenResponseSchema,
} from '@openpeeps/common/types';
import { registerHandler } from '$lib/server/api/handlers/auth/register';
import { conflict, forbidden } from '$lib/server/api/errors';

export const Input = registerRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  422: conflict(),
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(registerHandler);
