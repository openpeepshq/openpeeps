import { endpoint } from '#lib/endpoint';
import { webhookKeyResponseSchema } from '@openpeeps/common/types';
import { jwtUtil } from '@openpeeps/core/jwt';

export const Output = webhookKeyResponseSchema;

export const apiEndpoint = endpoint({ Output }).handle(async () => {
  const jwt = await jwtUtil();
  return { publicKey: jwt.publicKey };
});
