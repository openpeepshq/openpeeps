import { Endpoint } from 'sveltekit-api';
import { webhookKeyResponseSchema } from '@openpeeps/common/types';
import { jwtUtil } from '@openpeeps/core/jwt';

export const Output = webhookKeyResponseSchema;

export default new Endpoint({ Output }).handle(async () => {
  const jwt = await jwtUtil();
  return { publicKey: jwt.publicKey };
});
