import { endpoint } from '#lib/endpoint';
import {
  webhookVerifyRequestSchema,
  webhookVerifyResponseSchema,
} from '@openpeeps/common/types';
import { jwtUtil } from '@openpeeps/core/jwt';
import { forbidden } from '#lib/errors';

export const Input = webhookVerifyRequestSchema;
export const Output = webhookVerifyResponseSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(async (input) => {
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
