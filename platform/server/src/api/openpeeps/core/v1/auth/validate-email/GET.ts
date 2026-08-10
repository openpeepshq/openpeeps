import { endpoint } from '#lib/endpoint';
import { badRequest } from '#lib/errors';
import {
  successResponseSchema,
  validateEmailQuerySchema,
} from '@openpeepshq/common/types';
import { validateEmailHandler } from '#lib/handlers/auth/validateEmail';

export const Query = validateEmailQuerySchema;
export const Output = successResponseSchema;

export const Error = {
  400: badRequest(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  validateEmailHandler,
);
