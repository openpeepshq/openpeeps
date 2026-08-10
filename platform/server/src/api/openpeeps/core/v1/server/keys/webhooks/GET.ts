import { endpoint } from '#lib/endpoint';
import { webhookKeyResponseSchema } from '@openpeepshq/common/types';
import { jwtUtil } from '@openpeepshq/core/jwt';

export const Output = webhookKeyResponseSchema;

export const apiEndpoint = endpoint({ Output }).handle(async () => {
  const jwt = await jwtUtil();
  return { publicKey: jwt.publicKey };
});
