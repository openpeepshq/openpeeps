import { Endpoint, z } from 'sveltekit-api';
import { notFound } from '$lib/server/api/errors';
import {
  type MediaStream,
  mediaStreamSchema,
} from '@openpeeps/common/types';
import { buildStream } from '@openpeeps/core/media';

export const Param = z.object({
  storageId: z.string(),
});

export const Output = mediaStreamSchema;

export const Error = {
  404: notFound(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async ({ storageId }): Promise<MediaStream> => {
    const stream = await buildStream(storageId);
    if (!stream) {
      throw notFound(`Stream ${storageId}`);
    }
    return stream;
  },
);
