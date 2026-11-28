import { endpoint } from '#lib/endpoint';
import {
  loginRequestSchema,
  tokenResponseSchema,
} from '@openpeepshq/common/types';
import { loginHandler } from '#lib/handlers/auth/login';
import { authNeeded, internalError } from '#lib/errors';

export const Input = loginRequestSchema;
export const Output = tokenResponseSchema;

export const Error = {
  401: authNeeded(),
  500: internalError(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  loginHandler,
);
