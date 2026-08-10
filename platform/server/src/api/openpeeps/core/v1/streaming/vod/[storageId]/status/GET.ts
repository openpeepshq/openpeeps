import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';
import {
  type MediaStream,
  mediaStreamSchema,
} from '@openpeepshq/common/types';
import { buildStream } from '@openpeepshq/core/media';

export const Param = z.object({
  storageId: z.string(),
});

export const Output = mediaStreamSchema;

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async ({ storageId }): Promise<MediaStream> => {
    const stream = await buildStream(storageId);
    if (!stream) {
      throw notFound(`Stream ${storageId}`);
    }
    return stream;
  },
);
