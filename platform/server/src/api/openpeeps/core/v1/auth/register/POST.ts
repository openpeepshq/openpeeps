import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  registerRequestSchema,
  tokenResponseSchema,
} from '@openpeepshq/common/types';
import { registerHandler } from '#lib/handlers/auth/register';
import {
  conflict,
  forbidden,
  internalError,
  unprocessableRequest,
} from '#lib/errors';

export const Input = registerRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  403: forbidden(),
  409: conflict(),
  422: unprocessableRequest(),
  500: internalError(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  (input, event: RequestEvent) =>
    registerHandler(input, event.context.authData),
);
