import * as Sentry from '@sentry/node';
import { logger } from '../log';

const log = logger('openpeeps:sentry');

let initialized = false;
let communityHostname: string | undefined;
let serviceName: 'api' | 'worker' | undefined;

export const COMMUNITY_HOSTNAME_TAG = 'community.hostname';
export const SERVICE_TAG = 'service';

export type SentryService = 'api' | 'worker';

export type SentryInitOptions = {
  dsn?: string;
  enabled?: boolean;
  /** Defaults to SENTRY_TRACES_SAMPLE_RATE or 0.1 */
  tracesSampleRate?: number;
  environment?: string;
  /** Community public host (`SERVER_HOST`); port/scheme stripped for the tag */
  hostname?: string;
  service?: SentryService;
};

/**
 * Strip scheme/port from `server.host` / `SERVER_HOST` for Sentry tags.
 */
export const normalizeServerHostname = (host: string): string => {
  const trimmed = host.trim();
  if (!trimmed) return 'unknown';
  try {
    const serverUrl = trimmed.includes('://') ? trimmed : `http://${trimmed}`;
    return new URL(serverUrl).hostname || 'unknown';
  } catch {
    return trimmed.split('/')[0]?.split(':')[0] || 'unknown';
  }
};

export const getCommunityHostname = (): string | undefined => communityHostname;

export const getSentryService = (): SentryService | undefined => serviceName;

/**
 * Resolve Sentry `environment`. Explicit override wins; otherwise use the
 * image/deploy `ENVIRONMENT` (set at Docker build from branch). Default `local`
 * — never fall back to `NODE_ENV` (Docker images always set that to production).
 */
export const resolveSentryEnvironment = (explicit?: string): string => {
  const fromExplicit = explicit?.trim();
  if (fromExplicit) return fromExplicit;
  const fromSentryEnv = process.env.SENTRY_ENVIRONMENT?.trim();
  if (fromSentryEnv) return fromSentryEnv;
  const fromEnvironment = process.env.ENVIRONMENT?.trim();
  if (fromEnvironment) return fromEnvironment;
  return 'local';
};

/**
 * Integration names of `@sentry/node@10.x`'s vendored DB instrumentations
 * (the SDK vendors its own copies; 9.x's standalone
 * `@opentelemetry/instrumentation-*` packages left the tree). They emit the
 * `db.user` span attribute unconditionally — GHSA-qqmp-wf37-98f9's behavior,
 * invisible to `pnpm audit` because the copies live inside the audited-clean
 * package. The only one that can ever match a module in this repo is
 * Postgres (drizzle/pg); the rest are inert here, but they are dropped
 * together so this list stays the complete set of vendored `db.user`
 * emitters.
 */
export const VENDORED_DB_INTEGRATION_NAMES = [
  'Postgres',
  'Mysql',
  'Mysql2',
  'Tedious',
  'Knex',
] as const;

export type SentryDefaultIntegrations = ReturnType<
  typeof Sentry.getAutoPerformanceIntegrations
>;

/**
 * Removes the vendored DB integrations (see
 * `VENDORED_DB_INTEGRATION_NAMES`) from the SDK default set so no `db.user`
 * attribute is emitted. Wired into `Sentry.init` below.
 */
export const withoutVendoredDbIntegrations = (
  integrations: SentryDefaultIntegrations,
): SentryDefaultIntegrations =>
  integrations.filter(
    (i) => !VENDORED_DB_INTEGRATION_NAMES.some((n) => i.name === n),
  );

/** Re-apply community tags on the current isolation scope (per-request). */
export const applyCommunitySentryTags = () => {
  if (communityHostname) {
    Sentry.getIsolationScope().setTag(
      COMMUNITY_HOSTNAME_TAG,
      communityHostname,
    );
  }
  if (serviceName) {
    Sentry.getIsolationScope().setTag(SERVICE_TAG, serviceName);
  }
};

/**
 * Initialize Sentry Node once. Safe to call when disabled / missing DSN.
 * Always records hostname/service for local diagnostics even when Sentry is off.
 */
export const initSentry = (options: SentryInitOptions = {}) => {
  if (options.hostname !== undefined) {
    communityHostname = normalizeServerHostname(options.hostname);
  }
  if (options.service !== undefined) {
    serviceName = options.service;
  }

  if (initialized) {
    if (communityHostname || serviceName) {
      applyCommunitySentryTags();
      if (communityHostname) {
        Sentry.setTag(COMMUNITY_HOSTNAME_TAG, communityHostname);
        Sentry.setContext('community', { hostname: communityHostname });
      }
      if (serviceName) {
        Sentry.setTag(SERVICE_TAG, serviceName);
      }
    }
    return;
  }

  const dsn = options.dsn ?? process.env.SENTRY_DSN;
  const enabled =
    options.enabled ?? (Boolean(dsn) && process.env.SENTRY_ENABLED !== '0');

  if (!enabled || !dsn) {
    log.info(
      {
        communityHostname,
        service: serviceName,
      },
      'Sentry disabled (no DSN or explicitly off)',
    );
    initialized = true;
    return;
  }

  const tracesSampleRate =
    options.tracesSampleRate ??
    Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? '0.1');

  const environment = resolveSentryEnvironment(options.environment);

  Sentry.init({
    dsn,
    environment,
    tracesSampleRate: Number.isFinite(tracesSampleRate)
      ? tracesSampleRate
      : 0.1,
    integrations: withoutVendoredDbIntegrations,
  });

  if (communityHostname) {
    Sentry.setTag(COMMUNITY_HOSTNAME_TAG, communityHostname);
    Sentry.setContext('community', { hostname: communityHostname });
  }
  if (serviceName) {
    Sentry.setTag(SERVICE_TAG, serviceName);
  }

  initialized = true;
  log.info(
    {
      tracesSampleRate,
      environment,
      communityHostname,
      service: serviceName,
    },
    'Sentry Node performance initialized',
  );
};

export { Sentry };
