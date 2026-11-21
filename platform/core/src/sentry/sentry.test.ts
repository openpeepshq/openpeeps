import { afterEach, describe, expect, it } from 'vitest';
import * as Sentry from '@sentry/node';
import {
  initSentry,
  normalizeServerHostname,
  resolveSentryEnvironment,
  VENDORED_DB_INTEGRATION_NAMES,
  withoutVendoredDbIntegrations,
} from './index';

const ORIGINAL = {
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  ENVIRONMENT: process.env.ENVIRONMENT,
  NODE_ENV: process.env.NODE_ENV,
};

afterEach(() => {
  for (const [key, value] of Object.entries(ORIGINAL)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

describe('normalizeServerHostname', () => {
  it('strips port from host:port', () => {
    expect(normalizeServerHostname('localhost:5174')).toBe('localhost');
    expect(normalizeServerHostname('community.example.com:443')).toBe(
      'community.example.com',
    );
  });

  it('strips scheme when present', () => {
    expect(normalizeServerHostname('https://community.example.com')).toBe(
      'community.example.com',
    );
    expect(normalizeServerHostname('http://localhost:5174/path')).toBe(
      'localhost',
    );
  });

  it('returns bare hostname unchanged', () => {
    expect(normalizeServerHostname('community.blackambitionprize.com')).toBe(
      'community.blackambitionprize.com',
    );
  });

  it('handles empty input', () => {
    expect(normalizeServerHostname('')).toBe('unknown');
    expect(normalizeServerHostname('   ')).toBe('unknown');
  });
});

describe('resolveSentryEnvironment', () => {
  it('prefers an explicit argument', () => {
    process.env.SENTRY_ENVIRONMENT = 'staging';
    process.env.ENVIRONMENT = 'development';
    expect(resolveSentryEnvironment('production')).toBe('production');
  });

  it('uses SENTRY_ENVIRONMENT over ENVIRONMENT', () => {
    process.env.SENTRY_ENVIRONMENT = 'staging';
    process.env.ENVIRONMENT = 'development';
    expect(resolveSentryEnvironment()).toBe('staging');
  });

  it('uses ENVIRONMENT when Sentry override is unset', () => {
    delete process.env.SENTRY_ENVIRONMENT;
    process.env.ENVIRONMENT = 'development';
    process.env.NODE_ENV = 'production';
    expect(resolveSentryEnvironment()).toBe('development');
  });

  it('defaults to local and ignores NODE_ENV', () => {
    delete process.env.SENTRY_ENVIRONMENT;
    delete process.env.ENVIRONMENT;
    process.env.NODE_ENV = 'production';
    expect(resolveSentryEnvironment()).toBe('local');
  });
});

/**
 * @sentry/node 10.x vendors its own DB instrumentations and emits the
 * db.user span attribute unconditionally (GHSA-qqmp-wf37-98f9's behavior —
 * invisible to `pnpm audit` because the copies ship inside the audited-clean
 * package). initSentry must keep those integrations out of the effective
 * default set; these tests pin that so a future Sentry bump that re-adds
 * them fails loudly.
 */
const TEST_DSN = 'https://publickey@o1.ingest.sentry.io/1';

const activeIntegrationNames = (): string[] => {
  const client = Sentry.getClient();
  const integrations = (
    client as unknown as { _integrations?: Record<string, unknown> }
  )?._integrations;
  return Object.keys(integrations ?? {});
};

describe('initSentry vendored DB integration filter', () => {
  it('with an enabled DSN, no vendored db.user-emitting integration is active', () => {
    delete process.env.SENTRY_DSN;
    process.env.SENTRY_ENABLED = '1';
    process.env.SENTRY_ENVIRONMENT = 'test';

    initSentry({ dsn: TEST_DSN, tracesSampleRate: 0 });

    const names = activeIntegrationNames();
    for (const dbIntegration of VENDORED_DB_INTEGRATION_NAMES) {
      expect(names, `${dbIntegration} must not be active`).not.toContain(
        dbIntegration,
      );
    }
    // The filter must not take down non-DB auto-instrumentations.
    expect(names).toContain('Express');
    expect(names).toContain('Redis');
  });

  it('removes every vendored DB integration from the SDK default set', () => {
    const auto = Sentry.getAutoPerformanceIntegrations();
    const dbInDefaults = auto.filter((i) =>
      VENDORED_DB_INTEGRATION_NAMES.some((n) => i.name === n),
    );
    expect(dbInDefaults.map((i) => i.name)).toContain('Postgres');

    const filtered = withoutVendoredDbIntegrations(auto);
    const names = filtered.map((i) => i.name);
    for (const dbIntegration of VENDORED_DB_INTEGRATION_NAMES) {
      expect(names).not.toContain(dbIntegration);
    }
    // Non-DB auto-instrumentations survive the filter.
    for (const kept of ['Express', 'Fastify', 'Redis', 'Prisma']) {
      expect(names).toContain(kept);
    }
  });
});
