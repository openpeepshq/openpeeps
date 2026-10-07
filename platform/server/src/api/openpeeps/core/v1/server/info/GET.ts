import { endpoint } from '#lib/endpoint';
import { authNeeded, forbidden } from '#lib/errors';
import { serverInfoSchema } from '@openpeepshq/common/types';
import { isLivekitConnected } from '@openpeepshq/core/jams';
import { serverInfo, stablePublicServerInfo } from '@openpeepshq/core/server';

export const Output = serverInfoSchema;

export const Error = {
  403: forbidden(),
  401: authNeeded(),
};

const loadServerInfo = async () => {
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
};

export const apiEndpoint = endpoint({ Output, Error }).handle(async () => {
  // Integration restores a new backup into this process. The 10-minute payload
  // cache would keep the previous fixture's publicContent.
  if (process.env.DISABLE_CONFIG_CACHE === 'true') {
    return loadServerInfo();
  }
  // Reuse one JSON payload per 10-minute wall-clock bucket. Shipped RN clients
  // remount auth whenever /server/info identity changes (uptime + disk.freeBytes
  // otherwise churn every request).
  return stablePublicServerInfo.get(loadServerInfo);
});
