import { endpoint } from '#lib/endpoint';
import {
  registerRequestSchema,
  tokenResponseSchema,
} from '@openpeeps/common/types';
import { registerHandler } from '#lib/handlers/auth/register';
import { conflict, forbidden } from '#lib/errors';

export const Input = registerRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  422: conflict(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(registerHandler);
