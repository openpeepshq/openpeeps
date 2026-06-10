import { endpoint } from '#lib/endpoint';
import {
  successResponseSchema,
  updateAccountPasswordRequestSchema,
} from '@openpeeps/common/types';
import { forbidden, notFound } from '#lib/errors';
import { updateCurrentAccountPasswordHandler } from '#lib/handlers/accounts/updateCurrent';

export const Input = updateAccountPasswordRequestSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  updateCurrentAccountPasswordHandler,
);
