import { Endpoint } from 'sveltekit-api';
import { loginRequestSchema, tokenResponseSchema } from '@openpeeps/common/types';
import { loginHandler } from '$lib/server/api/handlers/auth/login';
import { forbidden, notFound } from '$lib/server/api/errors';

export const Input = loginRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(loginHandler);
