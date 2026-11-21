import { createRequire } from 'node:module';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import * as Sentry from '@sentry/node';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  normalizeServerHostname,
  resolveSentryEnvironment,
  VENDORED_DB_INTEGRATION_NAMES,
  withoutVendoredDbIntegrations,
} from './index';

/**
 * Replace only `Sentry.init` with a spy (delegating to the real init) so a
 * test can inspect the exact options `initSentry` passes — in particular
 * that `integrations` is a *function*, the only form under which the filter
 * replaces the SDK default set. The real `init` still runs, so the
 * effective-set assertions below keep working as before.
 */
vi.mock('@sentry/node', async (importActual) => {
  const actual = await importActual<typeof import('@sentry/node')>();
  return { ...actual, init: vi.fn(actual.init) };
});

const nodeRequire = createRequire(import.meta.url);
const sentryPkgRoot = dirname(nodeRequire.resolve('@sentry/node/package.json'));
const tracingIntegrationsDir = join(
  sentryPkgRoot,
  'build/cjs/integrations/tracing',
);

const ORIGINAL = {
  SENTRY_ENVIRONMENT: process.env.SENTRY_ENVIRONMENT,
  ENVIRONMENT: process.env.ENVIRONMENT,
  NODE_ENV: process.env.NODE_ENV,
  // initSentry reads these too; keep them in the restoration map.
  SENTRY_DSN: process.env.SENTRY_DSN,
  SENTRY_ENABLED: process.env.SENTRY_ENABLED,
  SENTRY_TRACES_SAMPLE_RATE: process.env.SENTRY_TRACES_SAMPLE_RATE,
};

beforeEach(() => {
  // Reset the module registry so `initSentry` tests can dynamically import a
  // fresh `./index` (its `initialized` closure otherwise sticks true after the
  // first call). Static imports above are already bound and unaffected.
  vi.resetModules();
  // Clear the init spy's call history so each test inspects its own
  // `Sentry.init` call(s), not ones made by earlier tests.
  vi.mocked(Sentry.init).mockClear();
});

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

/**
 * Names of the integrations installed on the active client, via the SDK's
 * public `getIntegrationNames()` (identical behavior to reading the client's
 * private `_integrations` map). Staying on the public surface keeps the
 * assertions below valid through a private-rename refactor.
 */
const activeIntegrationNames = (): string[] =>
  Sentry.getClient()?.getIntegrationNames() ?? [];

/**
 * Scan the installed `@sentry/node` for vendored `db.user` emitters and
 * resolve each emitting integration to its registered name (the same name
 * the integration reports as `name`). This is the canary that keeps
 * `VENDORED_DB_INTEGRATION_NAMES` complete: a future vendored DB
 * instrumentation that emits `DB_USER` under a new name shows up here even
 * though `pnpm audit` cannot see it. The path resolved from the installed
 * package here is the source of truth for the layout: if `@sentry/node`'s
 * layout changes (e.g. no `build/cjs` anymore), this canary throws
 * `unexpected @sentry/node layout` — update the resolver and
 * `VENDORED_DB_INTEGRATION_NAMES` from its output, not comments that quote
 * directory names.
 */
const vendoredDbUserEmitterNames = (): string[] => {
  const names: string[] = [];
  if (!existsSync(tracingIntegrationsDir)) {
    throw new Error(
      `unexpected @sentry/node layout (no ${tracingIntegrationsDir}); ` +
        'update the vendored DB-user canary to match',
    );
  }
  for (const dir of readdirSync(tracingIntegrationsDir)) {
    const integrationDir = join(tracingIntegrationsDir, dir);
    const vendoredDir = join(integrationDir, 'vendored');
    if (!existsSync(vendoredDir)) continue;
    const emitsDbUser = readdirSync(vendoredDir)
      .filter((file) => file.endsWith('.js'))
      .some((file) =>
        readFileSync(join(vendoredDir, file), 'utf8').includes('DB_USER'),
      );
    if (!emitsDbUser) continue;
    // The integration's own index registers INTEGRATION_NAME = "<Name>".
    const indexSource = readFileSync(join(integrationDir, 'index.js'), 'utf8');
    const match = indexSource.match(/INTEGRATION_NAME\s*=\s*"([^"]+)"/);
    if (!match) {
      throw new Error(
        `vendored ${dir} emits DB_USER but its index.js does not register ` +
          'an INTEGRATION_NAME; update the canary to match',
      );
    }
    names.push(match[1]);
  }
  return names;
};

describe('initSentry vendored DB integration filter', () => {
  it('with an enabled DSN, no vendored db.user-emitting integration is active', async () => {
    const { initSentry } = await import('./index');

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

  it('passes a function (not an array) as the integrations option', async () => {
    const { initSentry } = await import('./index');

    initSentry({ dsn: TEST_DSN, tracesSampleRate: 0 });

    const initCall = vi.mocked(Sentry.init).mock.calls[0];
    expect(initCall, 'Sentry.init must have been called').toBeDefined();
    // The function form is load-bearing: a callable *replaces* the default
    // set, while the array form *keeps* the defaults and overlays by name —
    // which would re-admit the five DB integrations.
    const integrations = (initCall![0] as { integrations?: unknown })
      .integrations;
    expect(
      typeof integrations,
      'initSentry must pass the callable form, not an array',
    ).toBe('function');
  });

  it('removes exactly the vendored db.user emitters from the SDK default set', () => {
    const auto = Sentry.getAutoPerformanceIntegrations();
    const autoNames = auto.map((i) => i.name);

    const filtered = withoutVendoredDbIntegrations(auto);
    const filteredNames = filtered.map((i) => i.name);
    const removed = autoNames.filter((name) => !filteredNames.includes(name));

    // Completeness in the forward direction: the filter must remove
    // precisely the vendored emitters that are part of the default set —
    // nothing less (a renamed emitter would survive) and nothing more (a
    // non-DB integration must not be collateral damage). Knex is a vendored
    // emitter but is not auto-registered by the SDK defaults, so the
    // expected side is the intersection with the default set.
    const expected = VENDORED_DB_INTEGRATION_NAMES.filter((name) =>
      autoNames.includes(name),
    );
    expect([...removed].sort()).toEqual([...expected].sort());

    // The canary must agree: every vendored DB_USER emitter is in the list.
    expect(vendoredDbUserEmitterNames().sort()).toEqual(
      [...VENDORED_DB_INTEGRATION_NAMES].sort(),
    );

    // Non-DB auto-instrumentations survive the filter.
    for (const kept of ['Express', 'Fastify', 'Redis', 'Prisma']) {
      expect(filteredNames).toContain(kept);
    }
  });

  it('covers every vendored db.user emitter in the installed @sentry/node', () => {
    // Canary, reverse direction: a future vendored emitter under a new name
    // (or a renamed one) cannot ship silently while staying outside the
    // filter list.
    const emitters = vendoredDbUserEmitterNames();
    expect(
      emitters.length,
      'expected at least one vendored db.user emitter',
    ).toBeGreaterThan(0);
    for (const emitter of emitters) {
      expect(
        VENDORED_DB_INTEGRATION_NAMES,
        `vendored emitter ${emitter} is not filtered by initSentry`,
      ).toContain(emitter);
    }
  });
});

describe('initSentry SENTRY_TRACES_SAMPLE_RATE parsing', () => {
  it('uses a numeric SENTRY_TRACES_SAMPLE_RATE from the environment', async () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = '0.5';
    const { initSentry } = await import('./index');

    initSentry({ dsn: TEST_DSN });

    const initCall = vi.mocked(Sentry.init).mock.calls.at(-1);
    expect(initCall, 'Sentry.init must have been called').toBeDefined();
    expect(initCall![0]).toMatchObject({ tracesSampleRate: 0.5 });
  });

  it('falls back to 0.1 when SENTRY_TRACES_SAMPLE_RATE is not numeric', async () => {
    process.env.SENTRY_TRACES_SAMPLE_RATE = 'not-a-number';
    const { initSentry } = await import('./index');

    initSentry({ dsn: TEST_DSN });

    const initCall = vi.mocked(Sentry.init).mock.calls.at(-1);
    expect(initCall, 'Sentry.init must have been called').toBeDefined();
    expect(initCall![0]).toMatchObject({ tracesSampleRate: 0.1 });
  });
});
