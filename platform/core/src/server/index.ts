import type { ServerInfo } from '@openpeeps/common/types';
import { communityConfig, config } from '../config';

export type DurationType =
  | 'yesterday'
  | 'today'
  | 'last7Days'
  | 'last30Days'
  | 'last90Days';
export const serverProtocol = async () =>
  (await config()).server.host.startsWith('localhost') ? 'http' : 'https';

export const serverRootUrl = async () =>
  `${await serverProtocol()}://${(await config()).server.host}`;

export const serverInfo = () =>
  config().then(
    async (coreConfig): Promise<ServerInfo> => ({
      version: coreConfig.version,
      environment: coreConfig.environment,
      publicContent: coreConfig.server.publicContent,
      communityConfig: {
        ...(await communityConfig()),
        settings: {
          ...(await communityConfig()).settings,
          openRegistrations: !!coreConfig.server.signUpsOpen,
        },
      },
      jams: {
        livekit: {
          url: coreConfig.jams.livekit.url,
          enabled:
            Boolean(coreConfig.jams.livekit.apiKey) &&
            Boolean(coreConfig.jams.livekit.apiSecret) &&
            Boolean(coreConfig.jams.livekit.url),
          recordingEnabled: !!coreConfig.jams.livekit.recordingEnabled,
        },
      },
      vapid: {
        publicKey: coreConfig.vapid.publicKey,
      },
      sentryConfig: {
        enabled: !!coreConfig.services?.sentry?.enabled,
        dsn: coreConfig.services?.sentry?.dsn,
        replayEnabled: !!coreConfig.services?.sentry?.replayEnabled,
      },
      payments: {
        stripe: {
          paidMembership: {
            enabled: !!coreConfig.payments?.stripe?.paidMembership?.enabled,
          },
        },
      },
      sso:
        coreConfig.sso.oidc.length > 0
          ? {
              oidc: coreConfig.sso.oidc.map(
                (p: { id: string; name: string }) => ({
                  id: p.id,
                  name: p.name,
                }),
              ),
            }
          : undefined,
    }),
  );
