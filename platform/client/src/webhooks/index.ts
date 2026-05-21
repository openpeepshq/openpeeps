import {
  webhookDataSchema,
  type WebhookData,
  type WebhookKeyResponse,
  type WebhookVerifyRequest,
} from '@openpeeps/common/types';
import { parseJwtKeyId, verifyJwt } from '@openpeeps/common/lib';
import type { OpenpeepsNoPayloadEndpoint } from '../types';

export type WebhookHandler = ((
  input: string,
) => Promise<WebhookData>);

export const webhookHandler = (
  publicKeyEndpoint: OpenpeepsNoPayloadEndpoint<WebhookKeyResponse>,
): WebhookHandler => {

  let publicKey: string | undefined = undefined;

  const getPublicKey = async (kid?: string) => {

    if (!kid) {
      throw new Error('Kid is required');
    }

    if (publicKey && publicKey === kid) {
      return publicKey;
    }

    const result = await publicKeyEndpoint();
    if ('error' in result) {
      throw result.error;
    }
    return result.data.publicKey;
  };


  return (async (input: string | WebhookVerifyRequest) => {
    const token = typeof input === 'string' ? input : input.token;
    const tokenKeyId = parseJwtKeyId(token);

    const verification = await verifyJwt(token, await getPublicKey(tokenKeyId));
    if (!verification) {
      throw new Error('Invalid webhook token');
    }

    return webhookDataSchema.parse(verification.payload);

  });
};
