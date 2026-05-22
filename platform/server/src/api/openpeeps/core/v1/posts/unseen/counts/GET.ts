import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import { getUnseenPostCounts } from '@openpeeps/core/posts';
import { unseenPostCountsSchema } from '@openpeeps/common/types';

export const Output = unseenPostCountsSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureLocalProfile(event);

    return getUnseenPostCounts(event.context.authData);
  },
);
