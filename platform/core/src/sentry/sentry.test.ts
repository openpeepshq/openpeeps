import { afterEach, describe, expect, it } from 'vitest';
import { normalizeServerHostname, resolveSentryEnvironment } from './index';

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
