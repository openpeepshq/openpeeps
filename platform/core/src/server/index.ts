import { sql } from 'drizzle-orm';
import type { ServerInfo } from '@openpeepshq/common/types';
import { communityConfig, config } from '../config';
import { database } from '../db';
import { normalizeComputedDatetime } from '../db/pg/mappers';
import { postSeen } from '../db/pg/schema';

export type DurationType =
  | 'yesterday'
  | 'today'
  | 'last7Days'
  | 'last30Days'
  | 'last90Days';

/** Infer http vs https for absolute URLs (OIDC redirects, emails, media). */
export const protocolForServerHost = (
  host: string,
  envProtocol = process.env.SERVER_PROTOCOL,
): 'http' | 'https' => {
  if (envProtocol === 'http' || envProtocol === 'https') {
    return envProtocol;
  }
  if (
    host.startsWith('localhost') ||
    host.startsWith('127.0.0.1') ||
    host.startsWith('[::1]')
  ) {
    return 'http';
  }
  // Docker/CI service names (e.g. web:8080) have no DNS domain — plain HTTP.
  const hostname = host.replace(/:\d+$/, '');
  if (!hostname.includes('.')) {
    return 'http';
  }
  return 'https';
};

export const serverProtocol = async () =>
  protocolForServerHost((await config()).server.host);

export const serverRootUrl = async () =>
  `${await serverProtocol()}://${(await config()).server.host}`;

const lastAccessedFromPostViews = async (): Promise<string | null> => {
  const db = await database();
  const rows = await db
    .select({ last: sql<string | null>`max(${postSeen.createdAt})` })
    .from(postSeen);
  return normalizeComputedDatetime(rows[0]?.last);
};

export const serverInfo = () =>
  config().then(
    async (coreConfig): Promise<ServerInfo> => ({
      version: coreConfig.version,
      environment: coreConfig.environment,
      publicContent: coreConfig.server.publicContent,
      lastAccessed: await lastAccessedFromPostViews(),
      maxProfiles: coreConfig.server.maxProfiles || undefined,
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
        enabled:
          !!coreConfig.services?.sentry?.enabled &&
          !!coreConfig.services?.sentry?.dsn,
        dsn: coreConfig.services?.sentry?.dsn,
        replayEnabled:
          !!coreConfig.services?.sentry?.replayEnabled &&
          !!coreConfig.services?.sentry?.dsn,
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
