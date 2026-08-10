import { endpoint } from '#lib/endpoint';
import {
  requestResetPasswordRequestSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { requestResetPasswordHandler } from '#lib/handlers/auth/resetPassword';
import { forbidden, notFound } from '#lib/errors';

export const Input = requestResetPasswordRequestSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  requestResetPasswordHandler,
);
