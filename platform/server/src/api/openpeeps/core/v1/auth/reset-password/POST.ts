import { endpoint } from '#lib/endpoint';
import {
  resetPasswordRequestSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { resetPasswordHandler } from '#lib/handlers/auth/resetPassword';
import { forbidden, notFound } from '#lib/errors';

export const Input = resetPasswordRequestSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  resetPasswordHandler,
);
