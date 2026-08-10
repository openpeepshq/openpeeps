import { endpoint } from '#lib/endpoint';
import { loginRequestSchema, tokenResponseSchema } from '@openpeepshq/common/types';
import { loginHandler } from '#lib/handlers/auth/login';
import { forbidden, notFound } from '#lib/errors';

export const Input = loginRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(loginHandler);
