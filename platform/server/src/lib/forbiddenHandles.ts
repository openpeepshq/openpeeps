import { isForbiddenHandle } from '@openpeepshq/common/types';
import { communityConfig } from '@openpeepshq/core/config';
import { unprocessableRequest } from '#lib/errors';

/** Built-in names plus this community's extra forbidden usernames. */
export const assertHandleAllowed = async (handle: string) => {
  const community = await communityConfig();
  if (
    isForbiddenHandle(handle, community.settings.additionalForbiddenHandles)
  ) {
    throw unprocessableRequest('Handle is reserved');
  }
};
