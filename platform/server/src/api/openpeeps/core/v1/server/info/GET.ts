import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { serverInfoSchema } from '@openpeepshq/common/types';
import { isLivekitConnected } from '@openpeepshq/core/jams';
import { serverInfo } from '@openpeepshq/core/server';

export const Output = serverInfoSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(async () => {
  // `serverInfo` only checks that LiveKit credentials exist. Probe the SFU so
  // broken keys/URLs disable jam start in the UI instead of failing on join.
  const [info, livekitConnected] = await Promise.all([
    serverInfo(),
    isLivekitConnected(),
  ]);
  return {
    ...info,
    jams: {
      ...info.jams,
      livekit: {
        ...info.jams.livekit,
        enabled: livekitConnected,
      },
    },
  };
});
