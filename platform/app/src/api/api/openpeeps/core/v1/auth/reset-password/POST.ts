import { Endpoint } from 'sveltekit-api';
import {
  resetPasswordRequestSchema,
  successResponseSchema,
} from '@openpeeps/common/types';
import { resetPasswordHandler } from '$lib/server/api/handlers/auth/resetPassword';
import { forbidden, notFound } from '$lib/server/api/errors';

export const Input = resetPasswordRequestSchema;
export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Input, Output, Error }).handle(
  resetPasswordHandler,
);
