import { Endpoint } from 'sveltekit-api';
import {
  webhookVerifyRequestSchema,
  webhookVerifyResponseSchema,
} from '@openpeeps/common/types';
import { jwtUtil } from '@openpeeps/core/jwt';
import { forbidden } from '$lib/server/api/errors';

export const Input = webhookVerifyRequestSchema;
export const Output = webhookVerifyResponseSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error }).handle(async (input) => {
  const jwt = await jwtUtil();
  const verification = await jwt.verify(input.token);

  if (!verification) {
    throw forbidden('Invalid webhook token');
  }

  return {
    success: true as const,
    payload: verification.payload as Record<string, unknown>,
  };
});
